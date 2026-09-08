const fs = require('fs');
const ts = require('typescript');

// Compile markdown-parser.service.ts to JS so we can run it
const source = fs.readFileSync('src/app/services/markdown-parser.service.ts', 'utf8');
const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
fs.writeFileSync('md-parser-compiled.js', result.outputText);

const { MarkdownParserService } = require('./md-parser-compiled.js');
const parser = new MarkdownParserService();

const rawText = `
اسم المادة : استطالع و عدو )ضباط( اسم النموذج : نموذج 1
السؤال 1 : المسئول المباشر عن تنظيم وإدارة اإلستطالع بناًء على تعليمات القائد وتعليمات قتال اإلستطالع للمستوى األعلى
أ( رئيس األركان ب( القائد
ج( رئيس اإلستطالع
اإلجابة الصحيحة: أ( رئيس األركان
السؤال 2 : من تنظيم ل مش ميكا اإلسرائيلي ..... ك مش ميكا + ..... ك بب
أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب
ج( 1 ك مش ميكا + 1 ك بب د( 2 ك مش ميكا + 1 ك بب
اإلجابة الصحيحة: د( 2 ك مش ميكا + 1 ك بب
السؤال 3 : من إمكانيات ل مظ اإلسرائيلي .............. قطعة ها 120 مم
أ( 7 قطعة ب( 8 قطعة
ج( 10 قطعة د( 12 قطعة
اإلجابة الصحيحة: ب( 8 قطعة
`;

// Simulate PDF Parser Fixes
function fixArabicLigatures(str) {
  let fixed = str.split('').map(char => {
    if (char === '(') return ')';
    if (char === ')') return '(';
    if (char === '[') return ']';
    if (char === ']') return '[';
    return char;
  }).join('');
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])([وبفك]?)ا([أإآا])ل/g, '$1$2ال$3');
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])ل([أإآا])ل/g, '$1لل$2');
  fixed = fixed.replace(/ىل(?=[\s،.؟!\-()\[\]]|$)/g, 'لى');
  fixed = fixed.replace(/ًال/g, 'لاً');
  const reversedLigatureWords = {
    'إطالق': 'إطلاق', 'إخالء': 'إخلاء', 'إسالم': 'إسلام', 'إعالن': 'إعلان', 'إغالق': 'إغلاق', 'إصالح': 'إصلاح',
    'إحالل': 'إحلال', 'إخالل': 'إخلال', 'استغالل': 'استغلال', 'استطالع': 'استطلاع', 'استهالك': 'استهلاك', 'خالصة': 'خلاصة',
    'حاالت': 'حالات', 'السالم': 'السلام', 'الميالد': 'الميلاد', 'العالقات': 'العلاقات', 'صالحيات': 'صلاحيات',
    'صالحية': 'صلاحية', 'غالف': 'غلاف', 'تالعب': 'تلاعب', 'سالح': 'سلاح', 'خالل': 'خلال', 'مالحظات': 'ملاحظات',
    'مالزم': 'ملازم', 'داللة': 'دلالة', 'دالئل': 'دلائل'
  };
  for (const [mangled, correct] of Object.entries(reversedLigatureWords)) {
    fixed = fixed.split(mangled).join(correct);
  }
  const standaloneReversals = {
    'ال': 'لا', 'وال': 'ولا', 'فال': 'فلا', 'إال': 'إلا', 'أال': 'ألا', 'كال': 'كلا', 'بال': 'بلا',
    'أوال': 'أولا', 'حاال': 'حالا', 'مستقال': 'مستقلا', 'أصال': 'أصلا', 'بدال': 'بدلا', 'كامال': 'كاملا',
    'شكال': 'شكلا', 'فعاال': 'فعالا', 'عاجال': 'عاجلا', 'قابال': 'قابلا', 'شامال': 'شاملا', 'مفصال': 'مفصلا'
  };
  const standaloneWordsPattern = Object.keys(standaloneReversals).join('|');
  const standaloneRegex = new RegExp(`(^|[\\s،.؟!\\-()\\[\\]])(${standaloneWordsPattern})(?=[\\s،.؟!\\-()\\[\\]]|$)`, 'g');
  fixed = fixed.replace(standaloneRegex, (match, p1, p2) => p1 + standaloneReversals[p2]);
  return fixed;
}

const fixedText = fixArabicLigatures(rawText);

const questions = parser.parseMarkdownToQuestions(fixedText);
console.log("Parsed Questions:", questions.length);
if (questions.length > 0) {
  console.log(JSON.stringify(questions, null, 2));
}

