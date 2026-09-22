import { Injectable } from '@angular/core';
import { QuizQuestion, QuizChoice } from '../models/quiz.model';
import { ExcelData, SheetInfo } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class MarkdownParserService {

  readMarkdownFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  normalizeInputText(text: string): string {
    if (!text) return '';
    let clean = text.replace(/\u0640/g, '');
    // 0. Inline answer annotations (e.g. ] الإجابة الصحيحة [ or [الإجابة الصحيحة] or ] خيار صحيح [)
    // Convert them to standard markdown checkbox task list marker [x]
    clean = clean.replace(/[\[\]\(\)]?\s*(?:ة\s*حيحصلا\s*ة\s*باجلاإ|اإلجابة\s*الصحيحة|الإجابة\s*الصحيحة|خيار\s*(?:صحيح|معتمد)(?:\s*أيضًا\s*بالمرجع)?)\s*[\[\]\(\)]?/gi, ' [x] ');

    // 1. True / False reversed pairs (e.g. حص ) أ أطخ ) ب)
    clean = clean.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) صح\n($2) خطأ\n');
    clean = clean.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n($1) خطأ\n($2) صح\n');
    clean = clean.replace(/(?:^|\s+)حص\s*[\(\)]\s*([أA])/gi, '\n($1) صح\n');
    clean = clean.replace(/(?:^|\s+)أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) خطأ\n');

    // 2. Answer Key normalization (handles standard and reversed 'ةحيحصلا باجلاإ')
    clean = clean.replace(/([\(\)]?\s*[أبجدa-h1-8]\s*[\(\)]?|حص\s*[\(\)]?\s*[أA]\s*[\(\)]?|أطخ\s*[\(\)]?\s*[بB]\s*[\(\)]?)\s*[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: $1\n');
    clean = clean.replace(/[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: ');

    // 3. Question Header normalization (handles reversed 'الؤسلا' / 'لؤسملا' / 'لاؤسلا' from single-line PDF extraction)
    const reversedHeaderRegex = /(?:[:\s]+(\d+)\s*(?:الؤسلا|لؤسملا|لؤئسملا|لاؤسلا)|(?:الؤسلا|لؤسملا|لؤئسملا|لاؤسلا)\s*[:\s]*(\d+))/gi;
    clean = clean.replace(reversedHeaderRegex, (m, p1, p2) => '\n\n#### السؤال ' + (p1 || p2) + ' :\n');

    return clean;
  }

  parseMarkdownToQuestions(markdownText: string): QuizQuestion[] {
    if (!markdownText) return [];

    const normalizedText = this.normalizeInputText(markdownText);
    const questions: QuizQuestion[] = [];
    const lines = normalizedText.split(/\r?\n/);
    
    let currentQText = '';
    let currentChoices: QuizChoice[] = [];
    let currentCorrectAnswers: string[] = [];
    let currentExplanation: string | null = null;
    let hasCurrentHeader = false;
    let currentHeaderTitle = '';

    const arabicChoiceMap: { [key: string]: string } = {
      'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
      'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H',
      '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H',
      '١': 'A', '٢': 'B', '٣': 'C', '٤': 'D', '٥': 'E', '٦': 'F', '٧': 'G', '٨': 'H'
    };

    const isFooterOrExaminerText = (text: string): boolean => {
      const norm = text.toLowerCase().trim();
      const footerPrefixes = [
        'إعداد:', 'اعداد:', 'إعداد /', 'اعداد /', 'إشراف:', 'اشراف:', 'إشراف /', 'اشراف /',
        'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة', 'عضو اللجنة',
        'توقيع', 'الممتحن', 'اللجنة الامتحانية', 'لجنة الاختبار',
        'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
        'اسم المراجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز',
        'examiner', 'signature', 'prepared by', 'approved by', 'committee'
      ];
      if (footerPrefixes.some(kw => norm.startsWith(kw))) {
        return true;
      }
      const footerContains = [
        'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة', 'توقيع الممتحن',
        'اللجنة الامتحانية', 'مع تمنياتنا بالنجاح', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله'
      ];
      if (norm.length < 80 && footerContains.some(kw => norm.includes(kw))) {
        return true;
      }
      const militaryRankRegex = /(?:^|\s)(?:عميد|عقيد|مقدم|رائد|نقيب|ملازم|لواء|فريق|مشير)(?:\s+أ\s*\.?\s*ح)?\s*[\/\s]/i;
      return militaryRankRegex.test(norm) && norm.length < 80;
    };

    const extractRef = (text: string): { clean: string; exp: string | null } => {
      if (!text.includes('المرجع') && !text.includes('بند') && !text.includes('صفحة') && !text.includes('مخطط')) {
        return { clean: text, exp: null };
      }
      const m = text.match(/(?:[—–]\s*[\(\[]?|[\(\[])\s*([^\n\r]*(?:المرجع|ص\s*\d+|بند|صفحة|مخطط)[^\n\r]*)[\)\]]?\s*$/);
      if (m && m.index !== undefined) {
        const clean = text.slice(0, m.index).replace(/[—–\-\s]+$/, '').trim();
        const exp = m[1].replace(/^[—–\-\(\)\[\]\s]+/, '').replace(/[\(\)\[\]\s]+$/, '').trim();
        return { clean, exp };
      }
      return { clean: text, exp: null };
    };

    const extractChoicesFromLine = (line: string): Array<{ label: string; text: string }> | null => {
      if (!line || !line.trim()) return null;
      const cleanLine = line.trim();

      // Normalize inline answer annotations (e.g. "- ] الإجابة الصحيحة [ )ج( اليدوية")
      const normalizedLine = cleanLine.replace(/[\[\]\(\)]?\s*(?:اإلجابة الصحيحة|الإجابة الصحيحة|خيار صحيح|خيار معتمد)\s*[\[\]\(\)]?/g, ' ');

      // 1. Single bullet choice line (standard markdown format: - **أ)** ... or * (أ) ...):
      const bulletMatch = normalizedLine.match(/^(?:[\s\-\*•]+)(?:\[[ xX]\]\s*)?(?:\*\*|__|\*)?[\(\)\[\]]?\s*([A-Ha-hأ-ي1-8])\s*[\.\)\:\-\(\]][\)\(\]]?(?:\*\*|__|\*)?\s*(.+)$/);
      if (bulletMatch) {
        let choiceText = bulletMatch[2].trim();
        choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();

        const refRes = extractRef(choiceText);
        choiceText = refRes.clean;
        if (refRes.exp) {
          currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
        }

        if (choiceText === 'حص') choiceText = 'صح';
        if (choiceText === 'أطخ') choiceText = 'خطأ';
        if (choiceText) return [{ label: bulletMatch[1], text: choiceText }];
      }

      // 2. Trailing labels: [Text] ) أ or [Text] (أ) (common in RTL visual PDF extraction)
      const trailingMarkerRegex = /(?:^|[\s،\.\-])[\(\)]\s*([أبجدa-hA-H])(?:\s*[\(\)])?(?=\s+|$)/g;
      const trailingMarkers: Array<{ label: string; startIndex: number; endIndex: number }> = [];
      let tMatch: RegExpExecArray | null;
      while ((tMatch = trailingMarkerRegex.exec(normalizedLine)) !== null) {
        trailingMarkers.push({
          label: tMatch[1],
          startIndex: tMatch.index,
          endIndex: tMatch.index + tMatch[0].length
        });
      }

      if (trailingMarkers.length > 0 && trailingMarkers[0].startIndex >= 2) {
        const choices: Array<{ label: string; text: string }> = [];
        let lastEnd = 0;
        for (let i = 0; i < trailingMarkers.length; i++) {
          const m = trailingMarkers[i];
          let choiceText = normalizedLine.slice(lastEnd, m.startIndex).trim();
          choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
          const refRes = extractRef(choiceText);
          choiceText = refRes.clean;
          if (refRes.exp) {
            currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
          }
          if (choiceText === 'حص') choiceText = 'صح';
          if (choiceText === 'أطخ') choiceText = 'خطأ';
          if (choiceText) {
            choices.push({
              label: m.label,
              text: choiceText
            });
          }
          lastEnd = m.endIndex;
        }
        if (choices.length > 0) return choices;
      }

      // 3. Leading labels: (أ) [Text] or أ( [Text] or A. [Text]
      const leadingPattern = /(?:^|[\s\-\*•]+)(?:\[[ xX]\]\s*)?(?:\*\*|__|\*)?[\(\)\[\]]?\s*([A-Ha-hأ-ي])\s*[\.\)\:\-\(\]][\)\(\]]?(?:\*\*|__|\*)?\s*/g;
      const leadingMarkers: Array<{ label: string; startIndex: number; matchLength: number }> = [];
      let lMatch: RegExpExecArray | null;
      while ((lMatch = leadingPattern.exec(normalizedLine)) !== null) {
        leadingMarkers.push({
          label: lMatch[1],
          startIndex: lMatch.index,
          matchLength: lMatch[0].length
        });
      }

      if (leadingMarkers.length > 0) {
        const choices: Array<{ label: string; text: string }> = [];
        for (let i = 0; i < leadingMarkers.length; i++) {
          const current = leadingMarkers[i];
          const textStart = current.startIndex + current.matchLength;
          const textEnd = (i < leadingMarkers.length - 1) ? leadingMarkers[i + 1].startIndex : normalizedLine.length;
          let choiceText = normalizedLine.slice(textStart, textEnd).trim();
          choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();

          const refRes = extractRef(choiceText);
          choiceText = refRes.clean;
          if (refRes.exp) {
            currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
          }

          if (choiceText === 'حص') choiceText = 'صح';
          if (choiceText === 'أطخ') choiceText = 'خطأ';
          if (choiceText) {
            choices.push({ label: current.label, text: choiceText });
          }
        }
        if (choices.length > 0) return choices;
      }

      return null;
    };

    const parseCorrectAnswer = (rawAns: string): string[] => {
      const cleanAns = rawAns.trim();
      if (/^(?:صح|صحيح|ص|حص|true|yes|نعم)$/i.test(cleanAns)) return ['A'];
      if (/^(?:خطأ|خاطئ|خ|أطخ|false|no|لا)$/i.test(cleanAns)) return ['B'];

      // 1. Check if rawAns is a single answer with label at start and option text following it:
      // E.g. "د( 2 ك مش ميكا + 1 ك بب" or "ب( 8 قطعة" or "أ) رئيس الأركان"
      const singleOptionWithTextMatch = cleanAns.match(/^[\(\)]?\s*([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s+(.+)$/);
      if (singleOptionWithTextMatch) {
        const trailingText = singleOptionWithTextMatch[2].trim();
        const hasMoreMarkers = /(?:^|[,;\s\u060C\u061B\/\+&]+)[\(\)]?\s*([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?=\s+|$)/.test(trailingText) ||
                               /(?:^|[,;\s\u060C\u061B]+)\s*([A-Ha-hأ-ي1-8])(?=\s*[,;\s\u060C\u061B]|$)/.test(trailingText);
        if (!hasMoreMarkers) {
          let label = singleOptionWithTextMatch[1].toUpperCase();
          if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
          if (/^[A-H]$/.test(label)) return [label];
        }
      }

      // 2. Multi-answer detection:
      // Delimiters: comma, Arabic comma, semicolon, Arabic semicolon, slash, plus, '&', or ' و '
      const normalizedDelimiterStr = cleanAns
        .replace(/\s+و\s+/g, ',')
        .replace(/[,;\u060C\u061B\/\+&]+/g, ',');

      const parts = normalizedDelimiterStr.split(',').map(p => p.trim()).filter(Boolean);
      const answers: string[] = [];

      for (const part of parts) {
        const subParts = part.split(/\s+/).filter(Boolean);
        for (const sub of subParts) {
          let cleanP = sub.replace(/[\(\)\[\]\.\:\-]/g, '').trim().toUpperCase();
          if (arabicChoiceMap[cleanP]) {
            cleanP = arabicChoiceMap[cleanP];
          }
          if (/^[A-H]$/.test(cleanP)) {
            if (!answers.includes(cleanP)) {
              answers.push(cleanP);
            }
          } else {
            const match = sub.match(/^[\(\)]?\s*([A-Ha-hأ-ي1-8])[\.\)\:\-\(]?$/);
            if (match) {
              let label = match[1].toUpperCase();
              if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
              if (/^[A-H]$/.test(label) && !answers.includes(label)) {
                answers.push(label);
              }
            }
          }
        }
      }

      if (answers.length > 0) {
        return answers;
      }

      // Fallback: single letter anywhere
      const letterMatch = cleanAns.match(/[\(\)]?\s*([A-Ha-hأ-ي1-8])\s*[\.\)\:\-\(]?/);
      if (letterMatch) {
        let label = letterMatch[1].toUpperCase();
        if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
        if (/^[A-H]$/.test(label)) return [label];
      }

      return [cleanAns];
    };

    const isSectionHeader = (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const sectionKeywords = [
        'النموذج', 'النماذج', 'امتحان', 'اختبار', 'مادة', 'جمهورية', 'دليل', 'التصحيح',
        'تعليمات', 'الفصل', 'الباب', 'الوحدة', 'قسم', 'تاريخ', 'المعتمدة',
        'model', 'exam', 'quiz', 'chapter', 'unit', 'instructions', 'guide'
      ];
      const norm = trimmed.toLowerCase().replace(/[*_#\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      if (sectionKeywords.some(kw => norm.startsWith(kw) || norm === kw)) {
        return true;
      }
      if (/^#+\s+[^\d]+$/i.test(trimmed)) {
        const afterHash = trimmed.replace(/^#+\s*/, '').trim();
        if (!/^(?:السؤال|سؤال|س|Q|Question)/i.test(afterHash)) {
          return true;
        }
      }
      return false;
    };

    const saveCurrentQuestion = () => {
      let qTextClean = currentQText.trim();

      // If no text, but we have choices or header, don't drop the question!
      if (!qTextClean && (currentChoices.length > 0 || hasCurrentHeader)) {
        qTextClean = currentHeaderTitle || `السؤال ${questions.length + 1}`;
      }
      if (!qTextClean) return;

      // Ignore intro/footer/section text that has no header AND no explicit choices
      if (!hasCurrentHeader && currentChoices.length === 0) {
        currentQText = '';
        return;
      }

      // Clean HTML comment tags if present
      qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
      // Remove leading # symbols or "#### السؤال 1" if qText starts with header
      const stripped = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*\s*/i, '').trim();
      if (stripped) {
        qTextClean = stripped;
      }

      if (qTextClean && !isFooterOrExaminerText(qTextClean)) {
        let choices = [...currentChoices];

        // If no explicit choices found, check if it's a True/False question or fallback
        if (choices.length === 0) {
          choices = [
            { id: 'A', label: 'A', text: 'صح / True' },
            { id: 'B', label: 'B', text: 'خطأ / False' }
          ];
        }

        const type: 'single' | 'multiple' = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
        const finalCorrect = currentCorrectAnswers.length === 1 
          ? currentCorrectAnswers[0] 
          : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (choices[0]?.id || 'A'));

        questions.push({
          id: `md_q_${questions.length + 1}`,
          text: qTextClean,
          choices,
          correctAnswer: finalCorrect,
          type,
          explanation: currentExplanation ? currentExplanation.trim() : null,
          difficulty: null,
          userAnswer: null
        });
      }

      currentQText = '';
      currentChoices = [];
      currentCorrectAnswers = [];
      currentExplanation = null;
      hasCurrentHeader = false;
      currentHeaderTitle = '';
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('<!--') && line.endsWith('-->')) continue;

      if (isSectionHeader(line)) {
        saveCurrentQuestion();
        hasCurrentHeader = false;
        currentQText = '';
        continue;
      }

      const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

      // Check for Question Header: #### السؤال 1 , 1. , س1: , Q1: , السؤال 1: , #### س 1
      const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i);
      const isHeader = !!qHeaderMatch && (
        /^(?:#+\s*)?(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
        /^\d+[\.\-\)]\s+/i.test(line)
      );
      
      // Check for Answer key line: **الإجابة:** A or Answer: A,C or الإجابة الصحيحة: أ( رئيس الأركان
      const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

      // Check for Explanation line: > Explanation text or Explanation: text or الشرح: text
      const expMatch = cleanLine.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير)[:\s]+)(.+)$/i);

      // Check for Choices line (can contain multiple choices on the same line)
      const extractedChoices = (!isHeader && !answerKeyMatch && !expMatch) ? extractChoicesFromLine(line) : null;

      if (isHeader) {
        saveCurrentQuestion();
        hasCurrentHeader = true;
        currentHeaderTitle = qHeaderMatch ? qHeaderMatch[0].replace(/^#+\s*/, '').trim() : '';
        currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : '';
        currentChoices = [];
        currentCorrectAnswers = [];
        currentExplanation = null;
      } else if (answerKeyMatch) {
        const parsedAns = parseCorrectAnswer(answerKeyMatch[1]);
        currentCorrectAnswers.push(...parsedAns);
      } else if (expMatch) {
        currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + expMatch[1].trim();
      } else if (extractedChoices) {
        extractedChoices.forEach(c => {
          let label = c.label.toUpperCase();
          if (arabicChoiceMap[label]) {
            label = arabicChoiceMap[label];
          }
          const choiceId = label;

          // Prevent adding duplicate choices for the same question
          if (!currentChoices.some(ch => ch.id === choiceId)) {
            currentChoices.push({
              id: choiceId,
              label: choiceId,
              text: c.text
            });
          }

          if (line.includes('[x]') || line.includes('[X]') || line.includes('اإلجابة الصحيحة') || line.includes('الإجابة الصحيحة') || line.includes('خيار صحيح') || line.includes('خيار معتمد')) {
            if (!currentCorrectAnswers.includes(choiceId)) {
              currentCorrectAnswers.push(choiceId);
            }
          }
        });
      } else if (!line.startsWith('#')) {
        const cleanContent = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
        if (cleanContent) {
          if (currentChoices.length > 0) {
            if (currentExplanation && (currentExplanation.includes('المرجع') || currentExplanation.includes('ص '))) {
              let cleanExpLine = cleanContent.replace(/[\)\(\]\[]\s*$/, '');
              currentExplanation += ' ' + cleanExpLine;
            } else {
              let lastChoice = currentChoices[currentChoices.length - 1];
              lastChoice.text += ' ' + cleanContent;
              
              const refRes = extractRef(lastChoice.text);
              if (refRes.exp) {
                currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
                lastChoice.text = refRes.clean;
              }
            }
          } else {
            currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
          }
        }
      }
    }

    saveCurrentQuestion();
    return questions;
  }

  convertMarkdownToExcelData(fileName: string, fileSize: number, markdownText: string): ExcelData {
    const questions = this.parseMarkdownToQuestions(markdownText);
    
    const headers = ['مسلسل', 'نص السؤال', 'الإجابة الصحيحة', 'الخيار أ (A)', 'الخيار ب (B)', 'الخيار ج (C)', 'الخيار د (D)', 'الشرح'];
    const rows = questions.map((q, idx) => {
      const row: any[] = [];
      row[0] = idx + 1;
      row[1] = q.text;
      row[2] = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(';') : q.correctAnswer;
      row[3] = q.choices[0]?.text || '';
      row[4] = q.choices[1]?.text || '';
      row[5] = q.choices[2]?.text || '';
      row[6] = q.choices[3]?.text || '';
      row[7] = q.explanation || '';
      return row;
    });

    const sheet: SheetInfo = {
      name: fileName.replace(/\.(md|markdown)$/i, ''),
      index: 0,
      rowCount: rows.length,
      colCount: headers.length,
      headers,
      rows,
      fileName
    };

    return {
      fileName,
      fileSize,
      sheets: [sheet],
      selectedSheet: 0
    };
  }
}
