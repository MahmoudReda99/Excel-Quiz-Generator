function extractChoicesFromLine(line) {
  if (!line || !line.trim()) return null;

  // Clean trailing punctuation / dashes
  const cleanLine = line.trim();

  // 1. Try trailing labels first: [Text] ) أ or [Text] (أ)
  const trailingMarkerRegex = /(?:^|[\s،\.\-])[\(\)]\s*([أبجدa-h1-8])(?:\s*[\(\)])?(?=\s+|$)/g;
  const trailingMarkers = [];
  let tMatch;
  while ((tMatch = trailingMarkerRegex.exec(cleanLine)) !== null) {
    trailingMarkers.push({
      label: tMatch[1],
      startIndex: tMatch.index,
      endIndex: tMatch.index + tMatch[0].length
    });
  }

  // If we have trailing markers and the first marker starts AFTER some text (> 1 chars):
  if (trailingMarkers.length > 0 && trailingMarkers[0].startIndex >= 2) {
    const choices = [];
    let lastEnd = 0;
    for (let i = 0; i < trailingMarkers.length; i++) {
      const m = trailingMarkers[i];
      let choiceText = cleanLine.slice(lastEnd, m.startIndex).trim();
      choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
      if (choiceText === 'حص') choiceText = 'صح';
      if (choiceText === 'أطخ') choiceText = 'خطأ';
      if (choiceText) {
        choices.push({
          label: m.label,
          text: choiceText
        });
      }
      lastEnd = m.endIndex;
    }
    if (choices.length > 0) return choices;
  }

  // 2. Standard leading labels: (أ) [Text] or أ( [Text] or A. [Text]
  const leadingPattern = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;
  const leadingMarkers = [];
  let lMatch;
  while ((lMatch = leadingPattern.exec(cleanLine)) !== null) {
    leadingMarkers.push({
      label: lMatch[1],
      startIndex: lMatch.index,
      matchLength: lMatch[0].length
    });
  }

  if (leadingMarkers.length > 0) {
    const choices = [];
    for (let i = 0; i < leadingMarkers.length; i++) {
      const current = leadingMarkers[i];
      const textStart = current.startIndex + current.matchLength;
      const textEnd = (i < leadingMarkers.length - 1) ? leadingMarkers[i + 1].startIndex : cleanLine.length;
      let choiceText = cleanLine.slice(textStart, textEnd).trim();
      choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
      if (choiceText === 'حص') choiceText = 'صح';
      if (choiceText === 'أطخ') choiceText = 'خطأ';
      if (choiceText) {
        choices.push({
          label: current.label,
          text: choiceText
        });
      }
    }
    if (choices.length > 0) return choices;
  }

  return null;
}

const linesToTest = [
  "ت اعورشمل ا ي ف ةكرتشملا ت ابيردتلا اعرجإ ) أ ةزكرملا ةئجافمل ا يوجلا ةبرضل ا ) ب ةيعادخل ا ةيسايسلا ت احيرصتل ا ) ج لوط ىلع ت ارغثلا حتف ) د",
  "حص ) أ أطخ ) ب",
  "أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب",
  "(أ) اختيار أول (ب) اختيار ثاني"
];

for (const l of linesToTest) {
  console.log("LINE:", l);
  console.log("PARSED:", extractChoicesFromLine(l));
  console.log("---");
}
