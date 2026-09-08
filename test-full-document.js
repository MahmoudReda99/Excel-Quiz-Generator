const fs = require('fs');

const rawDocumentText = `
اسم المادة : استطالع و عدو )ضباط( اسم النموذج : نموذج 1
السؤال 1 : المسئول المباشر عن تنظيم وإدارة اإلستطالع بناًء على تعليمات القائد وتعليمات قتال اإلستطالع للمستوى األعلى
أ( رئيس األركان ب( القائد
ج( رئيس اإلستطالع
اإلجابة الصحيحة: أ( رئيس األركان
السؤال 2 : من تنظيم ل مش ميكا اإلسرائيلي ..... ك مش ميكا + ..... ك بب
أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب
ج( 1 ك مش ميكا + 1 ك بب د( 2 ك مش ميكا + 1 ك بب
اإلجابة الصحيحة: د( 2 ك مش ميكا + 1 ك بب
السؤال 3 : من إمكانيات ل مظ اإلسرائيلي .............. قطعة ها 120 مم
أ( 7 قطعة ب( 8 قطعة
ج( 10 قطعة د( 12 قطعة
اإلجابة الصحيحة: ب( 8 قطعة
السؤال 4 : مبادئ الحرب اإلسرائيلية المرتبطة بالمعركة الهجومية ) المفاجأة - المبادأة - المحافظة على القوة الدافعة (
أ( صح ب( خطأ
اإلجابة الصحيحة: أ( صح
السؤال 5 : يستمع قائد اللواء / الفرقة الى تقرير رئيس اإلستطالع ويصدق على خطة اإلستطالع
أ( صح ب( خطأ
اإلجابة الصحيحة: أ( صح
السؤال 6 : قائد سرية إستطالع مؤخرة العدو هو المسئول عن تدريب وتجهيز السرية عالوة على ذلك معاونة رئيس إستطالع الفرقة في التخطيط لمجموعات المؤخرة
أ( صح ب( خطأ
اإلجابة الصحيحة: أ( صح

اسم المادة : استطالع و عدو )ضباط( اسم النموذج : نموذج 2
السؤال 1 : الخط الذى تبدأ عنده المعركة الدفاعية الرئيسية
أ( الحد األمامي لنطاق التغطية ب( الحد األمامي للمنطقة الدفاعية الرئيسية
ج( خط اإلنطالق د( خط الهجمة المضادة
اإلجابة الصحيحة: ب( الحد األمامي للمنطقة الدفاعية الرئيسية
السؤال 2 : ................ بإعداد خطة إستطالع اللواء / الفرقة بالتنسيق مع باقي هيئة القيادة
أ( قائد مجموعة اإلستطالع ب( قائد سرية اإلستطالع
ج( رئيس اإلستطالع
اإلجابة الصحيحة: ج( رئيس اإلستطالع
`;

function fixArabicLigatures(str) {
  let fixed = str.split('').map(char => {
    if (char === '(') return ')';
    if (char === ')') return '(';
    if (char === '[') return ']';
    if (char === ']') return '[';
    return char;
  }).join('');
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])([وبفك]?)ا([أإآا])ل/g, '$1$2ال$3');
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])ل([أإآا])ل/g, '$1لل$2');
  fixed = fixed.replace(/ىل(?=[\s،.؟!\-()\[\]]|$)/g, 'لى');
  fixed = fixed.replace(/ًال/g, 'لاً');
  const reversedLigatureWords = {
    'إطالق': 'إطلاق', 'إخالء': 'إخلاء', 'إسالم': 'إسلام', 'إعالن': 'إعلان', 'إغالق': 'إغلاق', 'إصالح': 'إصلاح',
    'إحالل': 'إحلال', 'إخالل': 'إخلال', 'استغالل': 'استغلال', 'استطالع': 'استطلاع', 'استهالك': 'استهلاك', 'خالصة': 'خلاصة',
    'حاالت': 'حالات', 'السالم': 'السلام', 'الميالد': 'الميلاد', 'العالقات': 'العلاقات', 'صالحيات': 'صلاحيات',
    'صالحية': 'صلاحية', 'غالف': 'غلاف', 'تالعب': 'تلاعب', 'سالح': 'سلاح', 'خالل': 'خلال', 'مالحظات': 'ملاحظات',
    'مالزم': 'ملازم', 'داللة': 'دلالة', 'دالئل': 'دلائل'
  };
  for (const [mangled, correct] of Object.entries(reversedLigatureWords)) {
    fixed = fixed.split(mangled).join(correct);
  }
  const standaloneReversals = {
    'ال': 'لا', 'وال': 'ولا', 'فال': 'فلا', 'إال': 'إلا', 'أال': 'ألا', 'كال': 'كلا', 'بال': 'بلا',
    'أوال': 'أولا', 'حاال': 'حالا', 'مستقال': 'مستقلا', 'أصال': 'أصلا', 'بدال': 'بدلا', 'كامال': 'كاملا',
    'شكال': 'شكلا', 'فعاال': 'فعالا', 'عاجال': 'عاجلا', 'قابال': 'قابلا', 'شامال': 'شاملا', 'مفصال': 'مفصلا'
  };
  const standaloneWordsPattern = Object.keys(standaloneReversals).join('|');
  const standaloneRegex = new RegExp(`(^|[\\s،.؟!\\-()\\[\\]])(${standaloneWordsPattern})(?=[\\s،.؟!\\-()\\[\\]]|$)`, 'g');
  fixed = fixed.replace(standaloneRegex, (match, p1, p2) => p1 + standaloneReversals[p2]);
  return fixed;
}

function extractChoicesFromLine(line) {
  const choicePattern = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;
  const matches = [];
  let match;
  while ((match = choicePattern.exec(line)) !== null) {
    matches.push({
      label: match[1],
      startIndex: match.index,
      matchLength: match[0].length
    });
  }

  if (matches.length === 0) return null;

  const choices = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const textStart = current.startIndex + current.matchLength;
    const textEnd = (i < matches.length - 1) ? matches[i + 1].startIndex : line.length;
    const choiceText = line.slice(textStart, textEnd).trim();
    choices.push({
      label: current.label,
      text: choiceText
    });
  }

  return choices;
}

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

function parseCorrectAnswer(rawAns) {
  const cleanAns = rawAns.trim();
  if (/^(?:صح|صحيح|ص|true|yes|نعم)$/i.test(cleanAns)) return ['A'];
  if (/^(?:خطأ|خاطئ|خ|false|no|لا)$/i.test(cleanAns)) return ['B'];

  const letterMatch = cleanAns.match(/[\(\)]?\s*([A-Ha-hأ-ي1-8])\s*[\.\)\:\-\(]?/);
  if (letterMatch) {
    let label = letterMatch[1].toUpperCase();
    if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
    if (/^[A-H]$/.test(label)) return [label];
  }

  const answers = [];
  const parts = cleanAns.split(/[,;\s\u060C]+/);
  parts.forEach(p => {
    let cleanP = p.replace(/[\(\)\[\]]/g, '').trim().toUpperCase();
    if (arabicChoiceMap[cleanP]) cleanP = arabicChoiceMap[cleanP];
    if (/^[A-H]$/.test(cleanP)) answers.push(cleanP);
  });

  return answers.length > 0 ? answers : [rawAns];
}

function parseDocument(rawText) {
  const fixedText = fixArabicLigatures(rawText);
  const lines = fixedText.split(/\r?\n/);
  const questions = [];

  let currentQText = '';
  let currentChoices = [];
  let currentCorrectAnswers = [];
  let currentExplanation = null;
  let hasCurrentHeader = false;

  const saveCurrentQuestion = () => {
    let qTextClean = currentQText.trim();
    if (!qTextClean) return;

    if (!hasCurrentHeader && currentChoices.length === 0) {
      currentQText = '';
      return;
    }

    qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
    qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*\s*/i, '').trim();

    if (qTextClean) {
      let choices = [...currentChoices];
      if (choices.length === 0) {
        choices = [
          { id: 'A', label: 'A', text: 'صح / True' },
          { id: 'B', label: 'B', text: 'خطأ / False' }
        ];
      }

      const type = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
      const finalCorrect = currentCorrectAnswers.length === 1 
        ? currentCorrectAnswers[0] 
        : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (choices[0]?.id || 'A'));

      questions.push({
        id: `q_${questions.length + 1}`,
        text: qTextClean,
        choices,
        correctAnswer: finalCorrect,
        type
      });
    }

    currentQText = '';
    currentChoices = [];
    currentCorrectAnswers = [];
    currentExplanation = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

    const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i);
    const isHeader = !!qHeaderMatch && (
      line.startsWith('#') || 
      /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
      /^\d+[\.\-\)]/i.test(line)
    );

    const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);
    const extractedChoices = extractChoicesFromLine(line);

    if (isHeader && !extractedChoices && !answerKeyMatch) {
      saveCurrentQuestion();
      hasCurrentHeader = true;
      currentQText = qHeaderMatch[1].trim();
      currentChoices = [];
      currentCorrectAnswers = [];
    } else if (answerKeyMatch) {
      const parsedAns = parseCorrectAnswer(answerKeyMatch[1]);
      currentCorrectAnswers.push(...parsedAns);
    } else if (extractedChoices) {
      extractedChoices.forEach(c => {
        let label = c.label.toUpperCase();
        if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
        const choiceId = label;
        currentChoices.push({
          id: choiceId,
          label: choiceId,
          text: c.text
        });
      });
    } else {
      if (currentChoices.length > 0) {
        currentChoices[currentChoices.length - 1].text += ' ' + cleanLine;
      } else {
        currentQText += (currentQText ? '\n' : '') + cleanLine;
      }
    }
  }
  saveCurrentQuestion();

  return questions;
}

const parsedQuestions = parseDocument(rawDocumentText);
console.log("TOTAL PARSED QUESTIONS:", parsedQuestions.length);
console.log(JSON.stringify(parsedQuestions, null, 2));
