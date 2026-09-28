import { AnswerNormalizerService } from './dist-test/services/answer-normalizer.service.js';
import { QuestionSearchService } from './dist-test/services/question-search.service.js';

console.log('================================================================================');
console.log(' AUTOMATED TEST SUITE: Question Search & Highlight Features');
console.log('================================================================================\n');

const normalizer = new AnswerNormalizerService();
const searchService = new QuestionSearchService(normalizer);

const sampleQuestions = [
  {
    id: 'q1',
    text: 'تنظيم قيادة كتيبة المدفعية من ف أ ن + ف سطع',
    choices: [
      { id: 'A', label: 'A', text: 'صح / True' },
      { id: 'B', label: 'B', text: 'خطأ / False' }
    ],
    correctAnswer: 'A',
    userAnswer: 'A',
    type: 'single',
    explanation: 'السند من المرجع صفحة 12'
  },
  {
    id: 'q2',
    text: 'تقسم المدفعية من حيث وسيلة الإطلاق إلى مدفعية ذات مواسير ومقذوفات موجهة',
    choices: [
      { id: 'A', label: 'A', text: 'مدفعية ذات مواسير' },
      { id: 'B', label: 'B', text: 'مقذوفات موجهة' },
      { id: 'C', label: 'C', text: 'مدفعية صاروخية' },
      { id: 'D', label: 'D', text: 'جميع ما سبق' }
    ],
    correctAnswer: 'D',
    userAnswer: 'B',
    type: 'single',
    explanation: 'تشمل كافة الأنواع الثلاثة'
  },
  {
    id: 'q3',
    text: 'ما هي مهام الاستطلاع التكتيكي للقوات؟',
    choices: [
      { id: 'A', label: 'A', text: 'مراقبة العدو' },
      { id: 'B', label: 'B', text: 'تحديد الأهداف' }
    ],
    correctAnswer: 'A',
    userAnswer: null,
    type: 'single',
    explanation: null
  }
];

let testsPassed = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    testsPassed++;
    console.log(`  ✅ PASSED: ${testName}`);
  } else {
    console.error(`  ❌ FAILED: ${testName}`);
  }
}

// 1. Test search in Question Text with Arabic Normalization
assert(searchService.matches(sampleQuestions[0], 0, 'كتيبة'), 'Search matches exact word in question text');
assert(searchService.matches(sampleQuestions[0], 0, 'كتيبه'), 'Search matches with Taa Marbuta / Haa normalization (كتيبه -> كتيبة)');
assert(searchService.matches(sampleQuestions[1], 1, 'الاطلاق'), 'Search matches with Alef Hamza normalization (الاطلاق -> الإطلاق)');
assert(searchService.matches(sampleQuestions[1], 1, 'مدفعيه وسيله'), 'Search matches multi-word query across question text');

// 2. Test search in Choices
assert(searchService.matches(sampleQuestions[1], 1, 'صاروخية'), 'Search matches text inside choice options');
assert(searchService.matches(sampleQuestions[1], 1, 'صاروخيه'), 'Search matches choice text with normalized Taa Marbuta');
assert(searchService.matches(sampleQuestions[2], 2, 'الأهداف'), 'Search matches choice option text in question 3');

// 3. Test search in Explanation
assert(searchService.matches(sampleQuestions[0], 0, 'المرجع'), 'Search matches text inside explanation');
assert(searchService.matches(sampleQuestions[1], 1, 'الثلاثة'), 'Search matches explanation keyword (الثلاثة)');

// 4. Test search by Question Number & Aliases
assert(searchService.matches(sampleQuestions[0], 0, '1'), 'Search matches by digit "1"');
assert(searchService.matches(sampleQuestions[1], 1, '#2'), 'Search matches by "#2"');
assert(searchService.matches(sampleQuestions[2], 2, 'Q3'), 'Search matches by "Q3"');
assert(searchService.matches(sampleQuestions[2], 2, 'سؤال 3'), 'Search matches by "سؤال 3"');

// 5. Test filterQuestions method combining search query and status filter
const allMatches = searchService.filterQuestions(sampleQuestions, 'مدفعية');
assert(allMatches.length === 2, 'Filtered questions count for "مدفعية" is 2');

const correctMatches = searchService.filterQuestions(sampleQuestions, 'مدفعية', 'correct');
assert(correctMatches.length === 1 && correctMatches[0].originalIndex === 0, 'Filtered correct questions for "مدفعية" is Q1');

const wrongMatches = searchService.filterQuestions(sampleQuestions, 'مدفعية', 'wrong');
assert(wrongMatches.length === 1 && wrongMatches[0].originalIndex === 1, 'Filtered wrong questions for "مدفعية" is Q2');

const unansweredMatches = searchService.filterQuestions(sampleQuestions, 'استطلاع', 'unanswered');
assert(unansweredMatches.length === 1 && unansweredMatches[0].originalIndex === 2, 'Filtered unanswered questions for "استطلاع" is Q3');

const noMatches = searchService.filterQuestions(sampleQuestions, 'كلمة_غير_موجودة');
assert(noMatches.length === 0, 'Filtered non-existing query returns 0 matches');

console.log('\n================================================================================');
console.log(` RESULT: ${testsPassed}/${totalTests} tests passed (${Math.round((testsPassed / totalTests) * 100)}%)`);
console.log('================================================================================\n');

if (testsPassed !== totalTests) {
  process.exit(1);
}
