const lines = [
  "السؤال1:هيخالصةاإلستنتاجات",
  "-)أ(المقدمة",
  "-]اإلجابةالصحيحة[)ج(الخالصةالعامة—)المرجع،ص333،بند433-أ(",
  "- [ الإجابة الصحيحة ] (ج) الخلاصة العامة",
  "السؤال5:)ماي(إختصارشهريوليو",
  "-)أ(صح",
  "-]اإلجابةالصحيحة[)ب(خطأ—)المرجع،ص363،بند504-أ-16:اختصاريوليوهو”يول”،أما”ماي”فهومايو("
];

for (let line of lines) {
  let isCorrectChoice = false;
  // Remove all spaces for the marker check to be robust!
  let lineNoSpaces = line.replace(/\s+/g, '');
  
  if (lineNoSpaces.includes('[الإجابةالصحيحة]') || 
      lineNoSpaces.includes(']الإجابةالصحيحة[') ||
      lineNoSpaces.includes('[اإلجابةالصحيحة]') || 
      lineNoSpaces.includes(']اإلجابةالصحيحة[')) {
    isCorrectChoice = true;
    // Remove it from the original line, keeping other chars
    line = line.replace(/\[\s*ا[لإإ]\s*ج\s*ا\s*ب\s*ة\s*ا\s*ل\s*ص\s*ح\s*ي\s*ح\s*ة\s*\]/g, '').trim();
    line = line.replace(/\]\s*ا[لإإ]\s*ج\s*ا\s*ب\s*ة\s*ا\s*ل\s*ص\s*ح\s*ي\s*ح\s*ة\s*\[/g, '').trim();
  }
  
  const choiceRegex = /^(?:[\-\*\+]\s*)?(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/;
  console.log(isCorrectChoice ? "CORRECT" : "NORMAL", line, "=>", line.match(choiceRegex)?.slice(1));
}
