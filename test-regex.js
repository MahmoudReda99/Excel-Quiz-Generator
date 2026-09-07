// If we remove all spaces, we get:
const lines = [
  "السؤال1:هيخالصةاإلستنتاجات",
  "-)أ(المقدمة",
  "-]اإلجابةالصحيحة[)ج(الخالصةالعامة—)المرجع،ص333،بند433-أ(",
  "السؤال5:)ماي(إختصارشهريوليو",
  "-)أ(صح",
  "-]اإلجابةالصحيحة[)ب(خطأ—)المرجع،ص363،بند504-أ-16:اختصاريوليوهو”يول”،أما”ماي”فهومايو("
];

const qHeaderMatchRegex = /^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i;

for (let line of lines) {
  // Let's modify the regex to not strictly require spaces after Question and number
  const qRegex = /^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i;
  
  // Wait, if it has no spaces: "السؤال1:هيخالصة"
  // (?:السؤال|سؤال|س|Q|Question) matches "السؤال"
  // \s* matches ""
  // \d+ matches "1"
  // [:\.\-]? matches ":"
  // \s* matches ""
  // (.*)$ matches "هيخالصة"
  
  console.log("QMatch:", line.match(qRegex));
  
  // Choice regex:
  // /^(?:[\-\*\+]\s*)?(?:\[[ xX]\]\s*)?(?:\*\*|\b)?\(?([A-Ha-hأ-ي1-8])[\.\)\:\-]\)?(?:\*\*|\b)?\s*(.+)$/
  // Let's see if it matches "-)أ(المقدمة"
  // (?:[\-\*\+]\s*)? matches "-"
  // (?:\[[ xX]\]\s*)? matches ""
  // \(? matches ""
  // ([A-Ha-hأ-ي1-8]) matches "أ" -> WAIT! The choice regex expects `\(?` but the text has `)أ(` because in RTL the parentheses are flipped!
  // In the original spaced text: `- ) أ (`
  const choiceRegex = /^(?:[\-\*\+]\s*)?(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/;
  console.log("ChoiceMatch:", line.match(choiceRegex));
}
