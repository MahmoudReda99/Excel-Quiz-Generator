if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const fs = await import('fs');
const path = await import('path');

// Load compiled Angular services dynamically after polyfill
const { PdfParserService } = await import('./dist-test/services/pdf-parser.service.js');
const { MarkdownParserService } = await import('./dist-test/services/markdown-parser.service.js');

async function runTests() {
  const pdfParser = new PdfParserService();
  const mdParser = new MarkdownParserService();

  const targetDir = '../خاص/تنظيم واستخدام عام';
  const pdfFiles = [
    {
      fileName: 'تنظيم الكتيبة المدفعية.pdf',
      expectedMinQuestions: 90,
      description: 'Artillery Battalion Organization'
    },
    {
      fileName: 'تنظيم الكتيبة المشاة الميكانيكى.pdf',
      expectedMinQuestions: 90,
      description: 'Mechanized Infantry Battalion Organization'
    },
    {
      fileName: 'تنظيم واستخدام الدفاع الجوى.pdf',
      expectedMinQuestions: 90,
      description: 'Air Defense Organization and Employment'
    },
    {
      fileName: 'تنظيم وإستخدام (ب).pdf',
      expectedMinQuestions: 50,
      description: 'General Organization and Employment (B)'
    },
    {
      fileName: 'تنظيم وإستخدام قوات الصاعقة.pdf',
      expectedMinQuestions: 90,
      description: 'Thunderbolt (Saaqa) Forces Organization and Employment'
    },
    {
      fileName: 'حل نماذج امتحانات مادة شئون إدارية.pdf',
      expectedMinQuestions: 90,
      description: 'Administrative Affairs Exam Solutions'
    }
  ];

  console.log('================================================================================');
  console.log(' AUTOMATED TEST SUITE: Organization & General Employment PDFs (/خاص/تنظيم واستخدام عام)');
  console.log('================================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  const summaryReport = [];

  const allDirFiles = fs.readdirSync(targetDir);

  for (let idx = 0; idx < pdfFiles.length; idx++) {
    const testDef = pdfFiles[idx];
    totalTests++;

    console.log(`[TEST ${idx + 1}/${pdfFiles.length}] Testing: "${testDef.fileName}" (${testDef.description})...`);

    function cleanFileName(str) {
      return str.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').normalize('NFC').trim();
    }

    const targetClean = cleanFileName(testDef.fileName);
    const actualFileName = allDirFiles.find(f => cleanFileName(f) === targetClean);

    if (!actualFileName) {
      console.error(`  ❌ FAILED: File not found in directory: ${testDef.fileName}`);
      summaryReport.push({ file: testDef.fileName, status: 'FAILED: File Not Found' });
      continue;
    }

    const filePath = path.join(targetDir, actualFileName);
    const fileBuffer = fs.readFileSync(filePath);

    const startTime = Date.now();
    const markdown = await pdfParser.extractTextFromArrayBuffer(new Uint8Array(fileBuffer));
    const questions = mdParser.parseMarkdownToQuestions(markdown);
    const elapsedMs = Date.now() - startTime;

    // Run Assertions
    const totalQuestions = questions.length;
    let validChoiceCount = 0;
    let validAnswerCount = 0;
    let singleChoiceCount = 0;
    let multipleChoiceCount = 0;
    let trueFalseCount = 0;

    for (const q of questions) {
      if (q.choices && q.choices.length >= 2) {
        validChoiceCount++;
      }
      if (q.choices && q.choices.length === 2) {
        trueFalseCount++;
      } else if (q.choices && q.choices.length >= 3) {
        if (q.type === 'multiple') multipleChoiceCount++;
        else singleChoiceCount++;
      }

      if (q.correctAnswer && (Array.isArray(q.correctAnswer) ? q.correctAnswer.length > 0 : typeof q.correctAnswer === 'string')) {
        validAnswerCount++;
      }
    }

    const hasEnoughQuestions = totalQuestions >= testDef.expectedMinQuestions;
    const allHaveValidChoices = validChoiceCount === totalQuestions && totalQuestions > 0;
    const allHaveValidAnswers = validAnswerCount === totalQuestions && totalQuestions > 0;

    const isPassed = hasEnoughQuestions && allHaveValidChoices && allHaveValidAnswers;

    if (isPassed) {
      passedTests++;
      console.log(`  ✅ PASSED (${elapsedMs}ms)`);
    } else {
      console.log(`  ❌ FAILED (${elapsedMs}ms)`);
    }

    console.log(`     • Total Extracted Questions : ${totalQuestions} (Expected >= ${testDef.expectedMinQuestions})`);
    console.log(`     • Questions with Valid Choices (>=2) : ${validChoiceCount}/${totalQuestions}`);
    console.log(`     • Questions with Valid Answers : ${validAnswerCount}/${totalQuestions}`);
    console.log(`     • Breakdown : ${trueFalseCount} True/False | ${singleChoiceCount} Single MCQ | ${multipleChoiceCount} Multi MCQ\n`);

    summaryReport.push({
      file: testDef.fileName,
      status: isPassed ? 'PASSED ✅' : 'FAILED ❌',
      questions: totalQuestions,
      validChoices: `${validChoiceCount}/${totalQuestions}`,
      validAnswers: `${validAnswerCount}/${totalQuestions}`,
      time: `${elapsedMs}ms`
    });
  }

  console.log('================================================================================');
  console.log(' TEST EXECUTION SUMMARY:');
  console.log('================================================================================');
  console.table(summaryReport);
  console.log(`\nResult: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
