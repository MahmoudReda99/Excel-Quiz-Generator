const lines = [
  "-)أ(المقدمة",
  "-)ج(الخالصةالعامة—)المرجع،ص333،بند433-أ(",
  "- [ الإجابة الصحيحة ] (ج) الخلاصة العامة",
  "السؤال5:)ماي(إختصارشهريوليو",
  "-)أ(صح",
  "-]اإلجابةالصحيحة[)ب(خطأ—)المرجع،ص363،بند504-أ-16:اختصاريوليوهو”يول”،أما”ماي”فهومايو("
];

for (let line of lines) {
  let isCorrectChoice = false;
  let lineNoSpaces = line.replace(/\s+/g, '');
  
  if (lineNoSpaces.includes('الإجابةالصحيحة') || lineNoSpaces.includes('اإلجابةالصحيحة')) {
    isCorrectChoice = true;
    line = line.replace(/^[^()]*?(الإجابة|اإلجابة)[^()]*?(الصحيحة|لصحيحة)[^()]*?[\]\[]/g, '').trim();
    // remove any leftover starting brackets or dashes
    line = line.replace(/^[-—\s\[\]]+/, '').trim();
  }
  
  // also replace any leading - space
  line = line.replace(/^[-—]\s*/, '');
  
  const choiceRegex = /^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/;
  let m = line.trim().match(choiceRegex);
  if (m) {
    let choiceText = m[2].trim();
    // Clean up trailing dashes from text
    choiceText = choiceText.replace(/[—\-\s]+$/, '');
    
    const expRegex = /(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]\s*$/;
    let expM = choiceText.match(expRegex);
    console.log("Choice:", m[1], "| Text:", expM ? expM[1].replace(/[—\-\s]+$/, '') : choiceText, "| Exp:", expM ? expM[2] : null);
  } else {
    console.log("Not choice:", line);
  }
}
