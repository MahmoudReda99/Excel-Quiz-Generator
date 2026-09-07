const lines = [
  "جمهورية مصر العربية",
  "مادة واجبات أركان حرب",
  "النموذج الأول",
  "السؤال 1: هل السماء زرقاء؟",
  "- )أ( نعم",
  "- ] الإجابة الصحيحة [ )ب( لا",
  "السؤال 2: ما هو اللون؟",
  "- )أ( أحمر",
  "- )ب( أزرق",
  "نص عشوائي في النهاية"
];

let questions = [];
let currentQText = '';
let currentChoices = [];
let currentExplanation = '';
let hasCurrentHeader = false;

const saveCurrentQuestion = () => {
  if (currentQText) {
    if (!hasCurrentHeader && currentChoices.length === 0) {
      console.log("Ignored fake question:", currentQText);
      currentQText = '';
      return;
    }
    questions.push({
      q: currentQText,
      choices: currentChoices.length
    });
  }
};

for (let line of lines) {
  const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
  const isHeaderMatch = !!qHeaderMatch;
  
  const choiceMatch = line.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

  if (isHeaderMatch && !choiceMatch) {
    saveCurrentQuestion();
    currentQText = qHeaderMatch[1].trim();
    currentChoices = [];
    currentExplanation = '';
    hasCurrentHeader = true;
  } else if (choiceMatch) {
    currentChoices.push({ text: choiceMatch[2] });
  } else {
    if (currentChoices.length > 0) {
      currentChoices[currentChoices.length - 1].text += ' ' + line;
    } else {
      currentQText = (currentQText ? currentQText + '\n' : '') + line;
    }
  }
}
saveCurrentQuestion();

console.log("Parsed Questions:", questions);
