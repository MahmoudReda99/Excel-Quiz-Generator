const fs = require('fs');
const ts = require('typescript');

// We'll simulate what MarkdownParserService does
const markdownText = `
السؤال 1 : المسئول المباشر عن تنظيم وإدارة الإستطلاع بناءً على تعليمات القائد وتعليمات قتال الإستطلاع للمستوى الأعلى
أ( رئيس الأركان ب( القائد
ج( رئيس الإستطالع
اإلجابة الصحيحة: أ( رئيس الأركان

السؤال 2 : من تنظيم ل مش ميكا الإسرائيلي ..... ك مش ميكا + ..... ك بب
أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب
ج( 1 ك مش ميكا + 1 ك بب د( 2 ك مش ميكا + 1 ك بب
اإلجابة الصحيحة: د( 2 ك مش ميكا + 1 ك بب
`;

const lines = markdownText.split(/\r?\n/);
let questions = [];
let currentQText = '';
let currentChoices = [];
let currentCorrectAnswers = [];
let currentExplanation = '';
let hasCurrentHeader = false;

const saveCurrentQuestion = () => {
  let qTextClean = currentQText.trim();
  if (!qTextClean) return;

  if (!hasCurrentHeader && currentChoices.length === 0) {
    currentQText = '';
    return;
  }

  questions.push({
    text: qTextClean,
    choices: [...currentChoices]
  });
  
  currentQText = '';
  currentChoices = [];
  currentCorrectAnswers = [];
  currentExplanation = '';
};

for (const line of lines) {
  if (!line.trim()) continue;
  let cleanLine = line.trim();

  const qHeaderMatch = cleanLine.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
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
    currentExplanation = '';
  } else if (answerKeyMatch) {
    // ...
  } else if (choiceMatch) {
    currentChoices.push({ text: choiceMatch[2] });
  } else {
    if (currentChoices.length > 0) {
      currentChoices[currentChoices.length - 1].text += ' ' + cleanLine;
    } else {
      currentQText += (currentQText ? '\n' : '') + cleanLine;
    }
  }
}
saveCurrentQuestion();

console.log(JSON.stringify(questions, null, 2));
