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

// 1. PDF Parser Fixes
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

// 2. Markdown Parser Logic
const questions = [];
const lines = fixedText.split(/\r?\n/);
let currentQText = '', currentChoices = [], currentCorrectAnswers = [], currentExplanation = null, hasCurrentHeader = false;

const isFooterOrExaminerText = (text) => false; // Simplified

const saveCurrentQuestion = () => {
  let qTextClean = currentQText.trim();
  if (!qTextClean) return;
  if (!hasCurrentHeader && currentChoices.length === 0) { currentQText = ''; return; }
  
  questions.push({ text: qTextClean, choices: currentChoices, correctAnswers: currentCorrectAnswers });
  currentQText = ''; currentChoices = []; currentCorrectAnswers = []; currentExplanation = null;
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();
  const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
  const isHeader = !!qHeaderMatch || cleanLine.startsWith('#');
  const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

  let isCorrectChoice = false;
  let cleanLineForChoice = line;
  let lineNoSpaces = cleanLineForChoice.replace(/\s+/g, '');

  if (lineNoSpaces.includes('الإجابةالصحيحة') || lineNoSpaces.includes('اإلجابةالصحيحة')) {
    isCorrectChoice = true;
    cleanLineForChoice = cleanLineForChoice.replace(/^[^()]*?(الإجابة|اإلجابة)[^()]*?(الصحيحة|لصحيحة)[^()]*?[\]\[]/g, '').trim();
    cleanLineForChoice = cleanLineForChoice.replace(/^[-—\s\[\]]+/, '').trim();
  }
  cleanLineForChoice = cleanLineForChoice.replace(/^[-—]\s*/, '').trim();

  const choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

  if (isHeader && !choiceMatch && !answerKeyMatch) {
    saveCurrentQuestion();
    hasCurrentHeader = true;
    currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : cleanLine.replace(/^#+\s*/, '').trim();
    currentChoices = [];
    currentCorrectAnswers = [];
  } else if (answerKeyMatch) {
    //
  } else if (choiceMatch) {
    currentChoices.push({ text: choiceMatch[2] });
  } else {
    if (currentChoices.length > 0) currentChoices[currentChoices.length - 1].text += ' ' + cleanLine;
    else currentQText += (currentQText ? '\n' : '') + cleanLine;
  }
}
saveCurrentQuestion();

console.log("Extracted Questions:", questions.length);
if (questions.length === 0) {
  console.log("FIXED TEXT:", fixedText);
} else {
  console.log(JSON.stringify(questions, null, 2));
}
