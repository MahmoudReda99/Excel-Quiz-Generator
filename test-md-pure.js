const fs = require('fs');

const rawText = `
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

const fixedText = fixArabicLigatures(rawText);

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

const questions = [];
const lines = fixedText.split(/\r?\n/);
let currentQText = '';
let currentChoices = [];
let currentCorrectAnswers = [];
let currentExplanation = null;
let hasCurrentHeader = false;
let optionIndex = 0;

const isFooterOrExaminerText = (text) => {
  const norm = text.toLowerCase().trim();
  const footerKeywords = [
    'إعداد', 'اعداد', 'إشراف', 'اشراف', 'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة',
    'توقيع', 'عضو اللجنة', 'الممتحن', 'المراجع', 'اللجنة الامتحانية', 'لجنة الاختبار',
    'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
    'ملاحظات', 'اسم المراجع', 'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز',
    'examiner', 'signature', 'prepared by', 'approved by', 'committee'
  ];
  if (footerKeywords.some(kw => norm.startsWith(kw) || (norm.length < 80 && norm.includes(kw)))) {
    return true;
  }
  const militaryRankRegex = /(?:^|\s)(?:عميد|عقيد|مقدم|رائد|نقيب|ملازم|لواء|فريق|مشير)(?:\s+أ\s*\.?\s*ح)?\s*[\/\s]/i;
  return militaryRankRegex.test(norm);
};

const saveCurrentQuestion = () => {
  let qTextClean = currentQText.trim();
  if (!qTextClean) return;

  if (!hasCurrentHeader && currentChoices.length === 0) {
    currentQText = '';
    return;
  }

  qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
  qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*/i, '').trim();

  if (qTextClean && !isFooterOrExaminerText(qTextClean)) {
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
  optionIndex = 0;
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.startsWith('<!--') && line.endsWith('-->')) continue;

  const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

  const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
  const isHeader = !!qHeaderMatch && (
    line.startsWith('#') || 
    /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
    /^\d+[\.\-\)]/i.test(line)
  );
  
  const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);
  const expMatch = cleanLine.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير)[:\s]+)(.+)$/i);

  let isCorrectChoice = false;
  let cleanLineForChoice = line;
  let lineNoSpaces = cleanLineForChoice.replace(/\s+/g, '');

  if (lineNoSpaces.includes('الإجابةالصحيحة') || lineNoSpaces.includes('اإلجابةالصحيحة')) {
    isCorrectChoice = true;
    cleanLineForChoice = cleanLineForChoice.replace(/^[^()]*?(الإجابة|اإلجابة)[^()]*?(الصحيحة|لصحيحة)[^()]*?[\]\[]/g, '').trim();
    cleanLineForChoice = cleanLineForChoice.replace(/^[-—\s\[\]]+/, '').trim();
  } else if (cleanLineForChoice.match(/\[[xX]\]/)) {
    isCorrectChoice = true;
  }
  
  cleanLineForChoice = cleanLineForChoice.replace(/^[-—]\s*/, '').trim();

  const choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

  if (isHeader && !choiceMatch && !answerKeyMatch) {
    saveCurrentQuestion();
    hasCurrentHeader = true;
    currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : cleanLine.replace(/^#+\s*/, '').trim();
    currentChoices = [];
    currentCorrectAnswers = [];
    currentExplanation = null;
    optionIndex = 0;
  } else if (answerKeyMatch) {
    const rawAns = answerKeyMatch[1].trim();
    if (rawAns === 'صح' || rawAns.toLowerCase() === 'true' || rawAns === 'نعم') {
      currentCorrectAnswers.push('A');
    } else if (rawAns === 'خطأ' || rawAns.toLowerCase() === 'false' || rawAns === 'لا') {
      currentCorrectAnswers.push('B');
    } else {
      const parts = rawAns.split(/[,;\s\u060C]+/);
      parts.forEach(p => {
        let cleanP = p.trim().toUpperCase();
        if (arabicChoiceMap[cleanP]) {
          cleanP = arabicChoiceMap[cleanP];
        }
        if (cleanP) {
          currentCorrectAnswers.push(cleanP);
        }
      });
    }
  } else if (expMatch) {
    currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + expMatch[1].trim();
  } else if (choiceMatch) {
    let label = choiceMatch[1].toUpperCase();
    if (arabicChoiceMap[label]) {
      label = arabicChoiceMap[label];
    }
    let choiceText = choiceMatch[2].replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').trim();
    choiceText = choiceText.replace(/[—\-\s]+$/, '');

    if (isCorrectChoice || choiceText.includes('المرجع')) {
      const explanationMatch = choiceText.match(/(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/);
      if (explanationMatch) {
        choiceText = explanationMatch[1].replace(/[—\-\s]+$/, '').trim();
        const exp = explanationMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
        currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + exp;
      }
    }

    let isChecked = isCorrectChoice;
    if (line.includes('[x]') || line.includes('[X]')) {
      isChecked = true;
    }

    const choiceId = label;
    currentChoices.push({
      id: choiceId,
      label: choiceId,
      text: choiceText
    });

    if (isChecked) {
      currentCorrectAnswers.push(choiceId);
    }

    optionIndex++;
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
          
          const expRegex = /(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/;
          const expMatch = lastChoice.text.match(expRegex);
          if (expMatch) {
            lastChoice.text = expMatch[1].replace(/[—\-\s]+$/, '').trim();
            const exp = expMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
            currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + exp;
          }
        }
      } else {
        currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
      }
    }
  }
}
saveCurrentQuestion();

console.log("QUESTIONS EXTRACTED:", questions.length);
if (questions.length > 0) {
  console.log(JSON.stringify(questions, null, 2));
}

