const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'exams', 'شئون ادارية');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

function cleanHeader(h) {
  return String(h || '').toLowerCase().replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();
}

const knownExcludes = [
  'serial', 'serial no.', 'score', 'difficulty', 'sharing range', 'range',
  'label', 'lable', 'materials and instructions', 'comprehensive questions', 'materials',
  'المواد العامة', 'التعليمات', 'مطلوبة للأسئلة', 'شرح الإجابة', 'شرح', 'التفسير',
  'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'كود المرجع', 'qeustion type', 'question type',
  'question tybe', 'qeustion tybe', 'نوع السؤال', 'النتيجة', 'نطاقات مشتركة'
];

function isQuestionHeader(h) {
  const norm = cleanHeader(h);
  if (knownExcludes.some(ex => norm.includes(ex))) return false;
  const matches = ['question text', 'question body', 'q_text', 'qtitle', 'نص السؤال', 'مضمون السؤال',
    'question', 'questions', 'q.', 'السؤال', 'سؤال', 'أسئلة', 'الأسئلة', 'الجذعية', 'جذعية'];
  return matches.some(p => norm === p || norm.includes(p));
}

function isAnswerHeader(h) {
  const norm = cleanHeader(h);
  if (knownExcludes.some(ex => norm.includes(ex))) return false;
  return ['correct answer', 'answer', 'correct', 'solution',
    'الإجابة الصحيحة', 'الحل', 'الإجابة', 'إجابة', 'الجواب', 'اجابة'].some(p => norm === p || norm.includes(p));
}

function isTypeHeader(h) {
  const norm = cleanHeader(h);
  return ['qeustion type', 'question type', 'question tybe', 'qeustion tybe',
    'qtype', 'q_type', 'type', 'النوع', 'نوع السؤال'].some(p => norm.includes(p));
}

function isChoiceHeader(h) {
  const norm = cleanHeader(h);
  if (knownExcludes.some(ex => norm.includes(ex))) return false;
  if (/^option\s+[a-h]/i.test(norm)) return true;
  if (/^choice\s+[a-h]/i.test(norm)) return true;
  if (/^[a-h]$/i.test(norm)) return true;
  if (['option a','option b','option c','option d','choice a','choice b','choice c','choice d'].some(p => norm.includes(p))) return true;
  return false;
}

function detectColumns(headers, rows) {
  let questionCol = null, correctAnswerCol = null, typeCol = null;
  let choiceCols = [];
  let p15_triggered = false, p15_realAnsFound = false, p15_realAnsCol = -1;
  let p2_triggered = false;

  headers.forEach((h, index) => {
    if (!h) return;
    if (isAnswerHeader(h) && correctAnswerCol === null) correctAnswerCol = index;
    else if (isTypeHeader(h) && typeCol === null) typeCol = index;
    else if (isQuestionHeader(h) && questionCol === null) questionCol = index;
    else if (isChoiceHeader(h)) choiceCols.push(index);
  });

  // Pass 1.5: check if "correctAnswerCol" data is actually long question text
  if (correctAnswerCol !== null && rows && rows.length > 0) {
    let totLen = 0, count = 0;
    rows.slice(0, 15).forEach(r => {
      if (r && r[correctAnswerCol] !== null && r[correctAnswerCol] !== undefined) {
        totLen += String(r[correctAnswerCol]).trim().length;
        count++;
      }
    });
    const avgLen = count > 0 ? totLen / count : 0;
    if (avgLen > 15) {
      p15_triggered = true;
      questionCol = correctAnswerCol;
      correctAnswerCol = null;

      const numCols = Math.max(headers.length, ...rows.map(r => r.length));
      for (let c = 0; c < numCols; c++) {
        if (c === questionCol || c === typeCol || choiceCols.includes(c)) continue;
        let shortCnt = 0, total = 0;
        rows.slice(0, 15).forEach(r => {
          if (r && r[c] !== null && r[c] !== undefined) {
            const str = String(r[c]).trim().toLowerCase();
            if (str.length < 12 && (str === 'true' || str === 'false' || /^[a-h1-8]$/.test(str) || str.includes(';'))) {
              shortCnt++;
            }
            total++;
          }
        });
        // Log each candidate column check
        if (total > 0) {
          console.log(`    P1.5 candidate col ${c} (hdr:"${String(headers[c] || '')}") shortCnt=${shortCnt} total=${total} ratio=${(shortCnt/total).toFixed(2)}`);
        }
        if (total > 0 && shortCnt / total >= 0.5) {
          p15_realAnsFound = true;
          p15_realAnsCol = c;
          correctAnswerCol = c;
          break;
        }
      }
    }
  }

  // Pass 2: question col fallback
  if (questionCol === null && rows && rows.length > 0) {
    p2_triggered = true;
    let maxAvg = 0, bestCol = -1;
    const numCols = Math.max(headers.length, ...rows.map(r => r.length));
    for (let c = 0; c < numCols; c++) {
      if (c === typeCol || c === correctAnswerCol || choiceCols.includes(c)) continue;
      const normH = cleanHeader(headers[c] || '');
      if (knownExcludes.some(ex => normH.includes(ex))) continue;
      let totalLen = 0, count = 0;
      rows.slice(0, 20).forEach(r => {
        if (r && r[c] !== null && r[c] !== undefined) {
          const v = String(r[c]).trim();
          if (v) { totalLen += v.length; count++; }
        }
      });
      const avg = count > 0 ? totalLen / count : 0;
      if (avg > maxAvg) { maxAvg = avg; bestCol = c; }
    }
    if (bestCol !== -1 && maxAvg > 10) questionCol = bestCol;
  }

  return { questionCol, correctAnswerCol, typeCol, choiceCols, p15_triggered, p15_realAnsFound, p15_realAnsCol, p2_triggered };
}

let totalSheets = 0, includedSheets = 0, excludedSheets = 0;
let excludedDetails = [];

files.forEach(f => {
  console.log('\n' + '='.repeat(70));
  console.log('FILE:', f);
  console.log('='.repeat(70));

  try {
    const wb = XLSX.readFile(path.join(dir, f));
    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      if (!raw || raw.length < 2) {
        console.log(`  [${sheetName}] EMPTY — SKIPPED`);
        return;
      }

      // Replicate header row detection: score rows 0-10
      let headerRowIdx = 0, maxScore = 0;
      for (let i = 0; i < Math.min(10, raw.length); i++) {
        const row = raw[i];
        if (!row) continue;
        let score = 0;
        row.forEach(cell => {
          const v = cleanHeader(cell);
          if (v.includes('question') || v.includes('answer') || v.includes('option') ||
              v.includes('choice') || v.includes('correct') || v.includes('type') ||
              v.includes('السؤال') || v.includes('إجابة') || v.includes('خيار')) score++;
        });
        if (score > maxScore) { maxScore = score; headerRowIdx = i; }
      }

      const headers = (raw[headerRowIdx] || []).map(h => h);
      const rows = raw.slice(headerRowIdx + 1).filter(r => r && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''));

      totalSheets++;
      console.log(`\n  Sheet: [${sheetName}]  headerRow=${headerRowIdx}  dataRows=${rows.length}`);
      console.log(`  Headers: ${headers.map((h,i) => `${i}:"${String(h||'').substring(0,25)}"`).join(' | ')}`);

      if (rows.length === 0) {
        console.log('  -> NO DATA ROWS — SKIPPED');
        excludedSheets++;
        excludedDetails.push(`${f} > ${sheetName}: NO DATA ROWS`);
        return;
      }

      const r = detectColumns(headers, rows);
      const included = r.questionCol !== null && r.correctAnswerCol !== null;

      console.log(`  questionCol    : ${r.questionCol} ${r.questionCol !== null ? '"' + String(headers[r.questionCol]||'').substring(0,30) + '"' : '❌ NULL'}`);
      console.log(`  correctAnsCol  : ${r.correctAnswerCol} ${r.correctAnswerCol !== null ? '"' + String(headers[r.correctAnswerCol]||'').substring(0,30) + '"' : '❌ NULL'}`);
      console.log(`  typeCol        : ${r.typeCol} ${r.typeCol !== null ? '"' + String(headers[r.typeCol]||'').substring(0,30) + '"' : ''}`);
      console.log(`  choiceCols     : [${r.choiceCols.join(', ')}]`);
      console.log(`  P1.5 triggered : ${r.p15_triggered}  realAnsFound: ${r.p15_realAnsFound}  at col: ${r.p15_realAnsCol}`);
      console.log(`  P2 triggered   : ${r.p2_triggered}`);
      console.log(`  >> MERGE: ${included ? '✅ INCLUDED' : '❌ EXCLUDED'}`);

      if (included) {
        includedSheets++;
        // Print sample Q and A
        const qc = r.questionCol, ac = r.correctAnswerCol;
        const sampleRow = rows[0];
        console.log(`  Sample Q: "${String(sampleRow[qc] || '').substring(0,60)}"`);
        console.log(`  Sample A: "${String(sampleRow[ac] || '').substring(0,30)}"`);
      } else {
        excludedSheets++;
        excludedDetails.push(`${f} > ${sheetName}: Q=${r.questionCol} A=${r.correctAnswerCol} P1.5=${r.p15_triggered} P1.5found=${r.p15_realAnsFound}`);
        // Print sample data of first 2 rows to diagnose
        console.log('  Sample data (first 2 data rows):');
        rows.slice(0, 2).forEach((row, i) => {
          console.log(`    Row${i}: ${row.map((c,ci) => `[${ci}]${JSON.stringify(String(c||'').substring(0,20))}`).join(' ')}`);
        });
      }
    });
  } catch(e) {
    console.log('  ERROR:', e.message);
  }
});

console.log('\n' + '='.repeat(70));
console.log(`SUMMARY: ${totalSheets} sheets total | ✅ ${includedSheets} INCLUDED | ❌ ${excludedSheets} EXCLUDED`);
if (excludedDetails.length > 0) {
  console.log('\nEXCLUDED SHEETS:');
  excludedDetails.forEach(d => console.log('  ❌ ' + d));
}
