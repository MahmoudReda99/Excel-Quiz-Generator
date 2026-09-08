import fs from 'fs';

const markdownText = `
السؤال 1 : المسئول المباشر عن تنظيم وإدارة الإستطالع بناءً على تعليمات القائد وتعليمات قتال الإستطالع للمستوى الأعلى
أ) رئيس الأركان ب) القائد
ج) رئيس الإستطالع
الإجابة الصحيحة: أ) رئيس الأركان
`;

const questions = [];
const lines = markdownText.split(/\r?\n/);

let currentQText = '';
let currentChoices = [];
let currentCorrectAnswers = [];
let currentExplanation = null;
let hasCurrentHeader = false;
let optionIndex = 0;

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

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
    const finalCorrect = 'A';
    questions.push({
      text: qTextClean,
      choices,
      correctAnswer: finalCorrect,
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
    // skip
  } else if (expMatch) {
    // skip
  } else if (choiceMatch) {
    let label = choiceMatch[1].toUpperCase();
    if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
    let choiceText = choiceMatch[2].replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').trim();
    currentChoices.push({ id: label, label, text: choiceText });
    optionIndex++;
  } else if (!line.startsWith('#')) {
    const cleanContent = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    if (cleanContent) {
      if (currentChoices.length > 0) {
        let lastChoice = currentChoices[currentChoices.length - 1];
        lastChoice.text += ' ' + cleanContent;
      } else {
        currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
      }
    }
  }
}
saveCurrentQuestion();

console.log("QUESTIONS: ", JSON.stringify(questions, null, 2));

