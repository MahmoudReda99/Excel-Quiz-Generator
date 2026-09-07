const lines = [
  "السؤال 16 : يتم تنفيذ إنتقال مركز القيادة المتقدم للواء من 3 - 4 مرة / يوم",
  "- )أ( صح",
  "- ] الإجابة الصحيحة [ )ب( خطأ — )المرجع، ص 360، جدول بند 500 : ينتقل بعد تحقيق المهمة المباشرة والمهمة",
  "التالية، أما الذي ينتقل 3 - 4 مرة فهو م ق ك ( 2",
  "السؤال 17: سؤال جديد",
  "- )أ( صح",
  "- )ب( خطأ"
];

let currentQText = '';
let currentChoices = [];
let currentExplanation = '';
let isHeader = false;

for (let line of lines) {
  let cleanLineForChoice = line;
  let lineNoSpaces = cleanLineForChoice.replace(/\s+/g, '');
  let isCorrectChoice = false;

  const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
  const isHeaderMatch = !!qHeaderMatch;

  if (lineNoSpaces.includes('الإجابةالصحيحة') || lineNoSpaces.includes('اإلجابةالصحيحة')) {
    isCorrectChoice = true;
    cleanLineForChoice = cleanLineForChoice.replace(/^[^()]*?(الإجابة|اإلجابة)[^()]*?(الصحيحة|لصحيحة)[^()]*?[\]\[]/g, '').trim();
    cleanLineForChoice = cleanLineForChoice.replace(/^[-—\s\[\]]+/, '').trim();
  }
  cleanLineForChoice = cleanLineForChoice.replace(/^[-—]\s*/, '').trim();

  const choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

  if (isHeaderMatch && !choiceMatch) {
    console.log("--- SAVE PREVIOUS ---");
    console.log("Q:", currentQText);
    console.log("Choices:", currentChoices);
    console.log("Exp:", currentExplanation);
    
    currentQText = qHeaderMatch[1].trim();
    currentChoices = [];
    currentExplanation = '';
  } else if (choiceMatch) {
    let choiceText = choiceMatch[2].trim();
    choiceText = choiceText.replace(/[—\-\s]+$/, '');
    
    if (isCorrectChoice || choiceText.includes('المرجع')) {
      // Made the trailing bracket optional
      const explanationMatch = choiceText.match(/(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/);
      if (explanationMatch) {
        choiceText = explanationMatch[1].replace(/[—\-\s]+$/, '').trim();
        const exp = explanationMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
        currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + exp;
      }
    }
    currentChoices.push({ text: choiceText });
  } else {
    const cleanContent = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    if (cleanContent) {
      if (currentChoices.length > 0) {
        if (currentExplanation && (currentExplanation.includes('المرجع') || currentExplanation.includes('ص '))) {
           let cleanExpLine = cleanContent.replace(/[\)\(\]\[]\s*$/, '');
           currentExplanation += ' ' + cleanExpLine;
        } else {
           let lastChoice = currentChoices[currentChoices.length - 1];
           lastChoice.text += ' ' + cleanContent;
           
           const expRegex = /(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/;
           const expMatch = lastChoice.text.match(expRegex);
           if (expMatch) {
             lastChoice.text = expMatch[1].replace(/[—\-\s]+$/, '').trim();
             currentExplanation = expMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
           }
        }
      } else {
        currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
      }
    }
  }
}
console.log("--- SAVE LAST ---");
console.log("Q:", currentQText);
console.log("Choices:", currentChoices);
console.log("Exp:", currentExplanation);

