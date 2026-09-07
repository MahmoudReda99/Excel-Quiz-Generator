const lines = [
  "-)أ(المقدمة",
  "-]اإلجابةالصحيحة[)ج(الخالصةالعامة—)المرجع،ص333،بند433-أ(",
  "- [ الإجابة الصحيحة ] (ج) الخلاصة العامة",
  "السؤال5:)ماي(إختصارشهريوليو",
  "-)أ(صح",
  "-]اإلجابةالصحيحة[)ب(خطأ—)المرجع،ص363،بند504-أ-16:اختصاريوليوهو”يول”،أما”ماي”فهومايو("
];

for (let line of lines) {
  let isCorrectChoice = false;
  let lineNoSpaces = line.replace(/\s+/g, '');
  
  if (lineNoSpaces.includes('الإجابةالصحيحة') || 
      lineNoSpaces.includes('اإلجابةالصحيحة')) {
    isCorrectChoice = true;
    // Just remove everything from [ to ] or ] to [ that contains the words
    line = line.replace(/[\[\]]\s*ا[لإإأ]?\s*ج\s*ا\s*ب\s*ة\s*ا\s*ل\s*ص\s*ح\s*ي\s*ح\s*ة\s*[\[\]]/g, '').trim();
    line = line.replace(/[\[\]]\s*ا[لإإأ]جابة\s*الصحيحة\s*[\[\]]/g, '').trim();
    // Or simpler:
    line = line.replace(/[\[\]]\s*ا[لإإأ]جابة\s*ا?لصحيحة\s*[\[\]]/g, '').trim();
    line = line.replace(/\]اإلجابةالصحيحة\[/g, '').trim();
    line = line.replace(/\]الإجابةالصحيحة\[/g, '').trim();
    line = line.replace(/\[اإلجابةالصحيحة\]/g, '').trim();
    line = line.replace(/\[الإجابةالصحيحة\]/g, '').trim();
  }
  
  const choiceRegex = /^(?:[\-\*\+]\s*)?(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/;
  console.log(isCorrectChoice ? "CORRECT" : "NORMAL", line, "=>", line.match(choiceRegex)?.slice(1));
}
