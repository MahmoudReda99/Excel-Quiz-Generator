const lines = [
  "- )أ( المقدمة",
  "- ] اإلجابة الصحيحة [ )ج( الخالصة العامة — )المرجع، ص 333، بند 433-أ(",
  "السؤال 5: )ماي( إختصار شهر يوليو",
  "- )ب( خطأ — )المرجع، ص 363، بند 504-أ-16: اختصار يوليو هو ”يول”، أما ”ماي” فهو مايو("
];

for (let line of lines) {
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

  const choiceRegex = /^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/;
  const choiceMatch = cleanLineForChoice.match(choiceRegex);
  
  if (choiceMatch) {
    let choiceText = choiceMatch[2].trim();
    choiceText = choiceText.replace(/[—\-\s]+$/, '');
    
    let currentExplanation = '';
    if (isCorrectChoice || choiceText.includes('المرجع')) {
      const explanationMatch = choiceText.match(/(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]\s*$/);
      if (explanationMatch) {
        choiceText = explanationMatch[1].replace(/[—\-\s]+$/, '').trim();
        const exp = explanationMatch[2].trim();
        currentExplanation = exp;
      }
    }
    
    console.log("Choice:", choiceMatch[1], "| Text:", choiceText, "| Exp:", currentExplanation);
  } else {
    console.log("Not Choice:", line);
  }
}
