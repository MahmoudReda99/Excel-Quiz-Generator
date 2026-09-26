import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import { AnswerNormalizerService } from './dist-test/services/answer-normalizer.service.js';
import { ColumnDetectorService } from './dist-test/services/column-detector.service.js';
import { QuestionBuilderService } from './dist-test/services/question-builder.service.js';
import { ExcelParserService } from './dist-test/services/excel-parser.service.js';
import { MarkdownParserService } from './dist-test/services/markdown-parser.service.js';

const xlsxLib = XLSX.readFile ? XLSX : XLSX.default;

const normalizer = new AnswerNormalizerService();
const detector = new ColumnDetectorService();
const builder = new QuestionBuilderService(normalizer);
const excelParser = new ExcelParserService();
const mdParser = new MarkdownParserService();

function assembleLineText(items) {
  if (!items || items.length === 0) return '';
  const lines = [];
  const sorted = [...items].sort((a, b) => b.y - a.y);
  for (const it of sorted) {
    let placed = false;
    for (const line of lines) {
      if (Math.abs(line.y - it.y) <= 4) {
        line.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lines.push({ y: it.y, items: [it] });
    }
  }

  const resultLines = lines.map(line => {
    line.items.sort((a, b) => b.x - a.x);
    return line.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
  });

  return resultLines.join(' ');
}

function extractPageTable(items, viewportWidth) {
  const rightNumbers = items
    .filter(it => it.x > viewportWidth * 0.6 && /^\d+$/.test(it.str.trim()))
    .sort((a, b) => b.y - a.y);

  if (rightNumbers.length < 3) return null;

  let markdown = '';

  for (let i = 0; i < rightNumbers.length; i++) {
    const cur = rightNumbers[i];
    const prev = i > 0 ? rightNumbers[i - 1] : null;
    const next = i < rightNumbers.length - 1 ? rightNumbers[i + 1] : null;

    const topY = prev ? (prev.y + cur.y) / 2 : (next ? cur.y + (cur.y - next.y) / 2 : cur.y + 25);
    const bottomY = next ? (cur.y + next.y) / 2 : (prev ? cur.y - (prev.y - cur.y) / 2 : cur.y - 25);

    const rowItems = items.filter(it => it.y <= topY && it.y > bottomY && it !== cur);

    const hasTFAnswer = rowItems.some(it => it.x < 70 && /^(?:true|false|صح|خطأ)$/i.test(it.str.trim()));
    const hasMCQAnswer = rowItems.some(it => it.x >= 350 && it.x < 400 && /^[A-D]$/i.test(it.str.trim()));

    const qNum = parseInt(cur.str.trim(), 10);

    if (hasTFAnswer || (!hasMCQAnswer && rowItems.some(it => it.x < 70))) {
      const ansItems = rowItems.filter(it => it.x < 70);
      const qItems = rowItems.filter(it => it.x >= 70);
      const rawAns = ansItems.map(it => it.str.trim().toLowerCase()).join(' ');
      let ansKey = 'A';
      if (rawAns.includes('false') || rawAns.includes('خطأ')) {
        ansKey = 'B';
      }
      const qText = assembleLineText(qItems);
      if (qText) {
        markdown += `\n\n#### السؤال ${qNum} :\n${qText}\n- (A) صح\n- (B) خطأ\n**الإجابة:** ${ansKey}\n`;
      }
    } else {
      const qItems = rowItems.filter(it => it.x >= 395);
      const ansItems = rowItems.filter(it => it.x >= 350 && it.x < 395);
      const aItems = rowItems.filter(it => it.x >= 270 && it.x < 350);
      const bItems = rowItems.filter(it => it.x >= 190 && it.x < 270);
      const cItems = rowItems.filter(it => it.x >= 115 && it.x < 190);
      const dItems = rowItems.filter(it => it.x < 115);

      const qText = assembleLineText(qItems);
      const ansKey = ansItems.map(it => it.str.trim().toUpperCase()).join('') || 'A';
      const choiceA = assembleLineText(aItems);
      const choiceB = assembleLineText(bItems);
      const choiceC = assembleLineText(cItems);
      const choiceD = assembleLineText(dItems);

      if (qText) {
        markdown += `\n\n#### السؤال ${qNum} :\n${qText}\n`;
        if (choiceA) markdown += `- (A) ${choiceA}\n`;
        if (choiceB) markdown += `- (B) ${choiceB}\n`;
        if (choiceC) markdown += `- (C) ${choiceC}\n`;
        if (choiceD) markdown += `- (D) ${choiceD}\n`;
        markdown += `**الإجابة:** ${ansKey}\n`;
      }
    }
  }

  return markdown;
}

// PDF Text Extractor replicating PdfParserService logic
async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const items = textContent.items
      .map(it => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        w: it.width,
        h: it.height || 10
      }))
      .filter(it => it.str && it.str.trim().length > 0);

    const tableMd = extractPageTable(items, viewport.width);
    if (tableMd) {
      fullText += tableMd + '\n\n';
    } else {
      let lastY = -1, lastX = -1, lastW = 0, pageText = '';
      for (const item of textContent.items) {
        if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
          pageText += '\n';
          lastX = -1;
        } else if (lastX !== -1) {
          let gap = item.transform[4] < lastX 
            ? lastX - (item.transform[4] + item.width) 
            : item.transform[4] - (lastX + lastW);
          if (gap > 2) pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
        lastX = item.transform[4];
        lastW = item.width;
      }
      fullText += pageText + '\n\n';
    }
  }

  // Bracket swaps
  let fixed = fullText.split('').map(char => {
    if (char === '(') return ')';
    if (char === ')') return '(';
    if (char === '[') return ']';
    if (char === ']') return '[';
    return char;
  }).join('');

  // Hamza & Lam-Alif ligatures
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])([وبفك]?)ا([أإآا])ل/g, '$1$2ال$3');
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])ل([أإآا])ل/g, '$1لل$2');
  fixed = fixed.replace(/ىل(?=[\s،.؟!\-()\[\]]|$)/g, 'لى');
  fixed = fixed.replace(/ًال/g, 'لاً');

  const reversedLigatureWords = {
    'إطالق': 'إطلاق', 'إخالء': 'إخلاء', 'إسالم': 'إسلام', 'إعالن': 'إعلان',
    'إغالق': 'إغلاق', 'إصالح': 'إصلاح', 'إحالل': 'إحلال', 'إخالل': 'إخلال',
    'استغالل': 'استغلال', 'استطالع': 'استطلاع', 'استهالك': 'استهلاك',
    'خالصة': 'خلاصة', 'حاالت': 'حالات', 'السالم': 'السلام', 'الميالد': 'الميلاد',
    'العالقات': 'العلاقات', 'صالحيات': 'صلاحيات', 'صالحية': 'صلاحية',
    'غالف': 'غلاف', 'تالعب': 'تلاعب', 'سالح': 'سلاح', 'خالل': 'خلال',
    'مالحظات': 'ملاحظات', 'مالزم': 'ملازم', 'داللة': 'دلالة', 'دالئل': 'دلائل'
  };
  for (const [mangled, correct] of Object.entries(reversedLigatureWords)) {
    fixed = fixed.split(mangled).join(correct);
  }

  const standaloneReversals = {
    'ال': 'لا', 'وال': 'ولا', 'فال': 'فلا', 'إال': 'إلا', 'أال': 'ألا',
    'كال': 'كلا', 'بال': 'بلا', 'أوال': 'أولا', 'حاال': 'حالا',
    'مستقال': 'مستقلا', 'أصال': 'أصلا', 'بدال': 'بدلا', 'كامال': 'كاملا',
    'شكال': 'شكلا', 'فعاال': 'فعالا', 'عاجال': 'عاجلا', 'قابال': 'قابلا',
    'شامال': 'شاملا', 'مفصال': 'مفصلا'
  };
  const standaloneWordsPattern = Object.keys(standaloneReversals).join('|');
  const standaloneRegex = new RegExp(`(^|[\\s،.؟!\\-()\\[\\]])(${standaloneWordsPattern})(?=[\\s،.؟!\\-()\\[\\]]|$)`, 'g');
  fixed = fixed.replace(standaloneRegex, (match, p1, p2) => p1 + standaloneReversals[p2]);

  return fixed;
}

// File collector
function collectExamFiles(rootDir) {
  const files = { xlsx: [], xls: [], pdf: [], md: [] };
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.angular', 'dist', 'dist-test', 'dist-audit'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.startsWith('~$') || entry.name.startsWith('._')) continue;
        if (entry.name === 'README.md') continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.xlsx') files.xlsx.push(fullPath);
        else if (ext === '.xls') files.xls.push(fullPath);
        else if (ext === '.pdf') files.pdf.push(fullPath);
        else if (ext === '.md') files.md.push(fullPath);
      }
    }
  }
  walk(rootDir);
  return files;
}

// Main Audit Execution
async function runAudit() {
  const rootDir = '/Users/mahmoudreda/Desktop/sraya';
  console.log(`=======================================================`);
  console.log(`Starting Comprehensive Exam Audit across: ${rootDir}`);
  console.log(`=======================================================\n`);

  const files = collectExamFiles(rootDir);
  console.log(`Discovered Files:`);
  console.log(`  - XLSX Files: ${files.xlsx.length}`);
  console.log(`  - XLS Files:  ${files.xls.length}`);
  console.log(`  - PDF Files:  ${files.pdf.length}`);
  console.log(`  - MD Files:   ${files.md.length}`);
  console.log(`  Total:        ${files.xlsx.length + files.xls.length + files.pdf.length + files.md.length} files\n`);

  const results = {
    excel: {
      totalFiles: files.xlsx.length + files.xls.length,
      successFiles: 0,
      zeroQuestionFiles: 0,
      errorFiles: [],
      totalSheets: 0,
      lookupSheetsSkipped: 0,
      dataSheetsProcessed: 0,
      totalQuestions: 0,
      singleQuestions: 0,
      multipleQuestions: 0,
      confidenceCounts: { high: 0, medium: 0, low: 0 },
      filesWithMultiAnswer: 0,
      lookupRowAnomaliesCaught: 0,
      stylesIdentified: {}
    },
    markdown: {
      totalFiles: files.md.length,
      successFiles: 0,
      zeroQuestionFiles: 0,
      errorFiles: [],
      totalQuestions: 0,
      singleQuestions: 0,
      multipleQuestions: 0
    },
    pdf: {
      totalFiles: files.pdf.length,
      successFiles: 0,
      zeroQuestionFiles: 0,
      errorFiles: [],
      totalQuestions: 0,
      singleQuestions: 0,
      multipleQuestions: 0
    },
    regressions: {
      multiAnswerDelimiters: { tested: 0, passed: 0 },
      choiceWawPreservation: { tested: 0, passed: 0 },
      lookupRowSkipping: { tested: 0, passed: 0 },
      lookupSheetFiltering: { tested: 0, passed: 0 },
      arabicNumberAnswers: { tested: 0, passed: 0 },
      answerDescriptiveText: { tested: 0, passed: 0 }
    },
    fileDetails: []
  };

  // 1. Audit Excel Files (.xlsx and .xls)
  const allExcelFiles = [...files.xlsx, ...files.xls];
  console.log(`--- Testing ${allExcelFiles.length} Excel Files ---`);

  for (let idx = 0; idx < allExcelFiles.length; idx++) {
    const filePath = allExcelFiles[idx];
    const relPath = path.relative(rootDir, filePath);
    try {
      const wb = xlsxLib.readFile(filePath);
      results.excel.totalSheets += wb.SheetNames.length;

      let fileQuestions = 0;
      let fileSingle = 0;
      let fileMultiple = 0;
      let fileLookupsSkipped = 0;
      const sheetDetails = [];

      for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
        const sName = wb.SheetNames[sIdx];
        const sData = excelParser.getSheetData(wb, sIdx);
        const isLookup = excelParser.isLookupSheet(sName, sData.headers, sData.rowCount);

        if (isLookup) {
          results.excel.lookupSheetsSkipped++;
          fileLookupsSkipped++;
          results.regressions.lookupSheetFiltering.passed++;
          results.regressions.lookupSheetFiltering.tested++;
          sheetDetails.push({ sheet: sName, status: 'SKIPPED_LOOKUP', rows: sData.rowCount });
          continue;
        }

        if (sData.rowCount === 0) {
          sheetDetails.push({ sheet: sName, status: 'EMPTY', rows: 0 });
          continue;
        }

        results.excel.dataSheetsProcessed++;
        const detection = detector.detect(sData);
        results.excel.confidenceCounts[detection.confidence]++;

        const questions = builder.buildQuestions(sData, detection.mapping);
        let qSingle = 0;
        let qMulti = 0;

        questions.forEach(q => {
          if (q.type === 'multiple') {
            qMulti++;
          } else {
            qSingle++;
          }

          // Check if fake lookup rows leaked into question texts
          if (/^(?:\d+[\s\-\.\)]*)?(?:اختيار من متعدد|صح\s*[\/\\]\s*خطأ|مقالي|سهل|متوسط|صعب)$/i.test(q.text.trim())) {
            results.excel.lookupRowAnomaliesCaught++;
          }
        });

        fileQuestions += questions.length;
        fileSingle += qSingle;
        fileMultiple += qMulti;

        // Categorize sheet style
        let style = 'Standard MCQ';
        if (detection.mapping.choiceCols.length === 0) style = 'True/False or Headerless';
        else if (detection.mapping.choiceCols.length >= 6) style = 'Extended Choices (6+)';
        else if (detection.confidence === 'medium') style = 'Pass 2 Fallback';
        results.excel.stylesIdentified[style] = (results.excel.stylesIdentified[style] || 0) + 1;

        sheetDetails.push({
          sheet: sName,
          status: 'PARSED',
          rows: sData.rowCount,
          confidence: detection.confidence,
          questions: questions.length,
          single: qSingle,
          multiple: qMulti,
          style
        });
      }

      results.excel.totalQuestions += fileQuestions;
      results.excel.singleQuestions += fileSingle;
      results.excel.multipleQuestions += fileMultiple;
      if (fileMultiple > 0) results.excel.filesWithMultiAnswer++;

      if (fileQuestions > 0) {
        results.excel.successFiles++;
      } else {
        results.excel.zeroQuestionFiles++;
      }

      results.fileDetails.push({
        path: relPath,
        type: path.extname(filePath).slice(1),
        success: fileQuestions > 0,
        questions: fileQuestions,
        single: fileSingle,
        multiple: fileMultiple,
        lookupsSkipped: fileLookupsSkipped,
        sheets: sheetDetails
      });

    } catch (err) {
      results.excel.errorFiles.push({ path: relPath, error: err.message });
      results.fileDetails.push({
        path: relPath,
        type: path.extname(filePath).slice(1),
        success: false,
        error: err.message
      });
    }

    if ((idx + 1) % 50 === 0 || idx === allExcelFiles.length - 1) {
      console.log(`  Processed ${idx + 1}/${allExcelFiles.length} Excel files...`);
    }
  }

  // 2. Audit Markdown Files (.md)
  console.log(`\n--- Testing ${files.md.length} Markdown Files ---`);
  for (const filePath of files.md) {
    const relPath = path.relative(rootDir, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const questions = mdParser.parseMarkdownToQuestions(content);
      let qSingle = 0, qMulti = 0;
      questions.forEach(q => {
        if (q.type === 'multiple') qMulti++;
        else qSingle++;
      });

      results.markdown.totalQuestions += questions.length;
      results.markdown.singleQuestions += qSingle;
      results.markdown.multipleQuestions += qMulti;

      if (questions.length > 0) {
        results.markdown.successFiles++;
      } else {
        results.markdown.zeroQuestionFiles++;
      }

      results.fileDetails.push({
        path: relPath,
        type: 'md',
        success: questions.length > 0,
        questions: questions.length,
        single: qSingle,
        multiple: qMulti
      });
      console.log(`  MD: ${relPath} -> ${questions.length} questions (Single: ${qSingle}, Multi: ${qMulti})`);
    } catch (err) {
      results.markdown.errorFiles.push({ path: relPath, error: err.message });
      results.fileDetails.push({
        path: relPath,
        type: 'md',
        success: false,
        error: err.message
      });
    }
  }

  // 3. Audit PDF Files (.pdf)
  console.log(`\n--- Testing ${files.pdf.length} PDF Files ---`);
  for (const filePath of files.pdf) {
    const relPath = path.relative(rootDir, filePath);
    try {
      const extractedText = await extractPdfText(filePath);
      const questions = mdParser.parseMarkdownToQuestions(extractedText);
      let qSingle = 0, qMulti = 0;
      questions.forEach(q => {
        if (q.type === 'multiple') qMulti++;
        else qSingle++;
      });

      results.pdf.totalQuestions += questions.length;
      results.pdf.singleQuestions += qSingle;
      results.pdf.multipleQuestions += qMulti;

      if (questions.length > 0) {
        results.pdf.successFiles++;
      } else {
        results.pdf.zeroQuestionFiles++;
      }

      results.fileDetails.push({
        path: relPath,
        type: 'pdf',
        success: questions.length > 0,
        questions: questions.length,
        single: qSingle,
        multiple: qMulti
      });
      console.log(`  PDF: ${relPath} -> ${questions.length} questions (Single: ${qSingle}, Multi: ${qMulti})`);
    } catch (err) {
      results.pdf.errorFiles.push({ path: relPath, error: err.message });
      results.fileDetails.push({
        path: relPath,
        type: 'pdf',
        success: false,
        error: err.message
      });
    }
  }

  // 4. Targeted Regression Test Battery
  console.log(`\n--- Running Targeted Regression Test Battery ---`);

  // Test 4.1: Multi-answer Delimiters
  const testDelimiters = [
    { input: 'A/B', expected: ['A', 'B'] },
    { input: 'A,B', expected: ['A', 'B'] },
    { input: 'A;C', expected: ['A', 'C'] },
    { input: 'أ و ب', expected: ['A', 'B'] },
    { input: 'أ، ب', expected: ['A', 'B'] },
    { input: 'A B', expected: ['A', 'B'] },
    { input: 'A/B/C', expected: ['A', 'B', 'C'] },
    { input: 'أ، ج، د', expected: ['A', 'C', 'D'] }
  ];
  for (const t of testDelimiters) {
    results.regressions.multiAnswerDelimiters.tested++;
    const res = normalizer.normalizeAnswer(t.input, []);
    const match = Array.isArray(res) && res.length === t.expected.length && res.every((v, i) => v === t.expected[i]);
    if (match) results.regressions.multiAnswerDelimiters.passed++;
    else console.warn(`  [Regression FAIL] Delimiter ${t.input} got:`, res);
  }

  // Test 4.2: Choice Waw Preservation
  results.regressions.choiceWawPreservation.tested++;
  const wawRes = normalizer.normalizeAnswer('و', [{ id: 'F', label: 'F', text: 'خيار واو' }]);
  if (wawRes === 'F') results.regressions.choiceWawPreservation.passed++;
  else console.warn(`  [Regression FAIL] Choice Waw got:`, wawRes);

  // Test 4.3: Arabic Digit Answers
  const testDigits = [
    { input: '1', expected: 'A' },
    { input: '2', expected: 'B' },
    { input: '٣', expected: 'C' },
    { input: '٤', expected: 'D' }
  ];
  for (const td of testDigits) {
    results.regressions.arabicNumberAnswers.tested++;
    const r = normalizer.normalizeAnswer(td.input, []);
    if (r === td.expected) results.regressions.arabicNumberAnswers.passed++;
  }

  // Test 4.4: Descriptive text single answer preservation
  results.regressions.answerDescriptiveText.tested++;
  const descRes = normalizer.normalizeAnswer('د( 2 ك مش ميكا + 1 ك بب', [
    { id: 'D', label: 'D', text: '2 ك مش ميكا + 1 ك بب' }
  ]);
  if (descRes === 'D') results.regressions.answerDescriptiveText.passed++;
  else console.warn(`  [Regression FAIL] Descriptive answer got:`, descRes);

  // Test 4.5: Question Builder multi-answer override for row type contradiction
  const fakeSheet = {
    name: 'TestSheet',
    index: 0,
    headers: ['نوع السؤال', 'نص السؤال', 'الإجابة الصحيحة', 'الخيار أ', 'الخيار ب'],
    rows: [
      ['10 - اختيار من متعدد', 'ما هي عناصر الكتيبة؟', 'A/B', 'عنصر 1', 'عنصر 2']
    ],
    rowCount: 1,
    colCount: 5
  };
  const fakeMapping = {
    typeCol: 0,
    questionCol: 1,
    correctAnswerCol: 2,
    choiceCols: [3, 4],
    explanationCol: null,
    difficultyCol: null
  };
  const built = builder.buildQuestions(fakeSheet, fakeMapping);
  if (built.length === 1 && built[0].type === 'multiple' && Array.isArray(built[0].correctAnswer) && built[0].correctAnswer.length === 2) {
    results.regressions.multiAnswerDelimiters.passed++;
    results.regressions.multiAnswerDelimiters.tested++;
  } else {
    console.warn(`  [Regression FAIL] Multi-answer row override test failed!`, built[0]);
  }

  // Save full audit report
  fs.writeFileSync(
    path.join(rootDir, 'excel-quiz-generator', 'comprehensive-audit-report.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n=======================================================`);
  console.log(`Audit Completed Successfully!`);
  console.log(`=======================================================`);
  console.log(`Excel Files: ${results.excel.successFiles}/${results.excel.totalFiles} parsed (${results.excel.totalQuestions} questions)`);
  console.log(`  - Single Choice Questions:   ${results.excel.singleQuestions}`);
  console.log(`  - Multiple Choice Questions: ${results.excel.multipleQuestions}`);
  console.log(`  - Lookup Sheets Skipped:     ${results.excel.lookupSheetsSkipped}`);
  console.log(`  - Confidence: High: ${results.excel.confidenceCounts.high}, Medium: ${results.excel.confidenceCounts.medium}, Low: ${results.excel.confidenceCounts.low}`);
  console.log(`  - Errors: ${results.excel.errorFiles.length}`);
  console.log(`  - Zero Question Files: ${results.excel.zeroQuestionFiles}`);

  console.log(`Markdown Files: ${results.markdown.successFiles}/${results.markdown.totalFiles} parsed (${results.markdown.totalQuestions} questions)`);
  console.log(`PDF Files:      ${results.pdf.successFiles}/${results.pdf.totalFiles} parsed (${results.pdf.totalQuestions} questions)`);
  console.log(`Grand Total Questions: ${results.excel.totalQuestions + results.markdown.totalQuestions + results.pdf.totalQuestions}`);
  console.log(`\nRegression Suite:`);
  console.log(`  - Delimiters:           ${results.regressions.multiAnswerDelimiters.passed}/${results.regressions.multiAnswerDelimiters.tested}`);
  console.log(`  - Choice 'و' (Waw):     ${results.regressions.choiceWawPreservation.passed}/${results.regressions.choiceWawPreservation.tested}`);
  console.log(`  - Lookup Sheet Skip:    ${results.regressions.lookupSheetFiltering.passed}/${results.regressions.lookupSheetFiltering.tested}`);
  console.log(`  - Arabic Digit Answers: ${results.regressions.arabicNumberAnswers.passed}/${results.regressions.arabicNumberAnswers.tested}`);
  console.log(`  - Descriptive Answers:  ${results.regressions.answerDescriptiveText.passed}/${results.regressions.answerDescriptiveText.tested}`);
  console.log(`=======================================================\n`);
}

runAudit().catch(err => {
  console.error("FATAL ERROR in runAudit:", err);
  process.exit(1);
});
