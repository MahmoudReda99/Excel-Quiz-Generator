let text = "جزءا ال يتجزأ، ال إله إال الله، وال يمكن أن يكون، فال بأس، كال، بال، أوال، حاال، مستقال، بدال، أصال.";

const standaloneReversals = {
  'ال': 'لا',
  'وال': 'ولا',
  'فال': 'فلا',
  'إال': 'إلا',
  'أال': 'ألا',
  'كال': 'كلا',
  'بال': 'بلا',
  'أوال': 'أولا',
  'حاال': 'حالا',
  'مستقال': 'مستقلا',
  'أصال': 'أصلا',
  'بدال': 'بدلا',
  'عمال': 'عملا', // wait, عمال is workers. Risky! Remove it.
  'شكال': 'شكلا', // أشكال is forms. شكال is shakkal. Safe.
  'كامال': 'كاملا', // كامال is not a word.
  'فصال': 'فصلا', // فصال (weaning). Risky.
};

// Build a dynamic regex for standalone whole words
const words = Object.keys(standaloneReversals).join('|');
const regex = new RegExp(`(^|[\\s،.؟!\\-()\[\\]])(${words})(?=[\\s،.؟!\\-()\[\\]]|$)`, 'g');

text = text.replace(regex, (match, p1, p2) => {
  return p1 + standaloneReversals[p2];
});

console.log(text);
