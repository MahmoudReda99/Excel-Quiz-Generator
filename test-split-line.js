function extractChoicesFromLine(line) {
  // Regex to find choice markers like: أ( or أ) or (أ) or أ. or A. or A) or B)
  // We look for boundaries where a choice label appears.
  const choicePattern = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;
  
  const matches = [];
  let match;
  while ((match = choicePattern.exec(line)) !== null) {
    matches.push({
      label: match[1],
      startIndex: match.index,
      matchLength: match[0].length,
      fullMatch: match[0]
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

const testLines = [
  "أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب",
  "ج( 1 ك مش ميكا + 1 ك بب د( 2 ك مش ميكا + 1 ك بب",
  "أ( 7 قطعة ب( 8 قطعة",
  "ج( 10 قطعة د( 12 قطعة",
  "أ( صح ب( خطأ",
  "أ( رئيس الأركان ب( القائد",
  "ج( رئيس الإستطالع"
];

for (const t of testLines) {
  console.log("LINE:", t);
  console.log("EXTRACTED:", extractChoicesFromLine(t));
  console.log("---");
}
