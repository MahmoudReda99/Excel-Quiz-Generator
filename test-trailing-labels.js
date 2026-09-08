const testLine = `ت اعورشمل ا ي ف ةكرتشملا ت ابيردتلا اعرجإ ) أ ةزكرملا ةئجافمل ا يوجلا ةبرضل ا ) ب ةيعادخل ا ةيسايسلا ت احيرصتل ا ) ج لوط ىلع ت ارغثلا حتف ) د`;

// Pattern where label is at the end: [Text] ) أ
// Notice: each segment ends with: ) [أبجدa-h1-8] or ( [أبجدa-h1-8] )
function extractTrailingChoices(line) {
  const markerRegex = /[\(\)]\s*([أبجدa-h1-8])(?:\s*[\(\)])?/g;
  const markers = [];
  let match;
  while ((match = markerRegex.exec(line)) !== null) {
    markers.push({
      label: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  if (markers.length === 0) return null;

  const choices = [];
  let lastEnd = 0;
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const choiceText = line.slice(lastEnd, m.startIndex).trim();
    if (choiceText) {
      choices.push({
        label: m.label,
        text: choiceText
      });
    }
    lastEnd = m.endIndex;
  }

  return choices;
}

const choices = extractTrailingChoices(testLine);
console.log("Extracted Trailing Choices:\n", JSON.stringify(choices, null, 2));
