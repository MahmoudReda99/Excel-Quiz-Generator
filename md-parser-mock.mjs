export function parseMarkdownToQuestions(markdownText) {
  const questions = [];
  const lines = markdownText.split(/\r?\n/);
  let currentQText = '', currentChoices = [], currentCorrectAnswers = [], currentExplanation = null, hasCurrentHeader = false;

  const saveCurrentQuestion = () => {
    let qTextClean = currentQText.trim();
    if (!qTextClean) return;
    if (!hasCurrentHeader && currentChoices.length === 0) { currentQText = ''; return; }
    qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
    qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*/i, '').trim();
    questions.push({ text: qTextClean, choices: currentChoices });
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
    } else if (answerKeyMatch) {
      // skip
    } else if (choiceMatch) {
      currentChoices.push({ text: choiceMatch[2] });
    } else {
      if (currentChoices.length > 0) currentChoices[currentChoices.length - 1].text += ' ' + cleanLine;
      else currentQText += (currentQText ? '\n' : '') + cleanLine;
    }
  }
  saveCurrentQuestion();
  return questions;
}
