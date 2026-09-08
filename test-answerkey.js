const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

function parseCorrectAnswer(rawAns) {
  const cleanAns = rawAns.trim();
  
  // Check for True / False keywords first
  if (/^(?:صح|صحيح|ص|true|yes|نعم)$/i.test(cleanAns)) {
    return ['A'];
  }
  if (/^(?:خطأ|خاطئ|خ|false|no|لا)$/i.test(cleanAns)) {
    return ['B'];
  }

  // Extract letter label like أ( or (أ) or أ) or أ or A or A) or B
  // Match first Arabic/English letter choice label in rawAns
  const letterMatch = cleanAns.match(/[\(\)]?\s*([A-Ha-hأ-ي1-8])\s*[\.\)\:\-\(]?/);
  if (letterMatch) {
    let label = letterMatch[1].toUpperCase();
    if (arabicChoiceMap[label]) {
      label = arabicChoiceMap[label];
    }
    if (/^[A-H]$/.test(label)) {
      return [label];
    }
  }

  // Fallback: split by separators
  const answers = [];
  const parts = cleanAns.split(/[,;\s\u060C]+/);
  parts.forEach(p => {
    let cleanP = p.replace(/[\(\)\[\]]/g, '').trim().toUpperCase();
    if (arabicChoiceMap[cleanP]) {
      cleanP = arabicChoiceMap[cleanP];
    }
    if (/^[A-H]$/.test(cleanP)) {
      answers.push(cleanP);
    }
  });

  return answers;
}

const testAnswers = [
  "أ( رئيس الأركان",
  "د( 2 ك مش ميكا + 1 ك بب",
  "ب( 8 قطعة",
  "أ( صح",
  "ب( خطأ",
  "أ",
  "B",
  "أ , ج"
];

for (const a of testAnswers) {
  console.log("RAW ANS:", a, "=> PARSED:", parseCorrectAnswer(a));
}
