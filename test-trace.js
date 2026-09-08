const arabicChoiceMap = { 'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D' };

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
  return ['A'];
}

const lines = [
  'السؤال 1 : المسئول المباشر عن تنظيم وإدارة الإستطالع بناًء على تعليمات القائد وتعليمات قتال الإستطالع للمستوى الأعلى',
  'أ( رئيس الأركان ب( القائد',
  'ج( رئيس الإستطالع',
  'الإجابة الصحيحة: أ( رئيس الأركان',
  'السؤال 2 : من تنظيم ل مش ميكا الإسرائيلي ..... ك مش ميكا + ..... ك بب',
  'أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب',
  'ج( 1 ك مش ميكا + 1 ك بب د( 2 ك مش ميكا + 1 ك بب',
  'الإجابة الصحيحة: د( 2 ك مش ميكا + 1 ك بب'
];

let currentCorrectAnswers = [];

for (const line of lines) {
  const answerKeyMatch = line.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);
  if (answerKeyMatch) {
    const parsed = parseCorrectAnswer(answerKeyMatch[1]);
    console.log("LINE:", line);
    console.log("PARSED ANSWERS:", parsed);
    currentCorrectAnswers.push(...parsed);
  }
}
console.log("FINAL ANSWERS:", currentCorrectAnswers);
