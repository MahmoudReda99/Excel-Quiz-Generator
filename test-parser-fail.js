const fs = require('fs');

const markdownText = `
السؤال 1 : المسئول المباشر عن تنظيم وإدارة الإستطالع
أ) رئيس الأركان ب) القائد
ج) رئيس الإستطالع
الإجابة الصحيحة: أ) رئيس الأركان
`;

const lines = markdownText.split(/\r?\n/);
let questions = [];
let currentQText = '';
let currentChoices = [];
let currentCorrectAnswers = [];
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
};

for (const line of lines) {
  if (!line.trim()) continue;
  let cleanLine = line.trim();

  const qHeaderMatch = cleanLine.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
  const isHeader = !!qHeaderMatch || cleanLine.startsWith('#');
  const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

  let cleanLineForChoice = cleanLine.replace(/^[-—]\s*/, '').trim();

  const choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

  if (isHeader && !choiceMatch && !answerKeyMatch) {
    saveCurrentQuestion();
    hasCurrentHeader = true;
    currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : cleanLine.replace(/^#+\s*/, '').trim();
    currentChoices = [];
  } else if (answerKeyMatch) {
    // skip for now
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
