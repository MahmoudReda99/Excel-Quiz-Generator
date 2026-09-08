import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

async function extractText(data) {
  const loadingTask = pdfjsLib.getDocument({ data: data });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let lastY = -1;
    let lastX = -1;
    let lastW = 0;
    let pageText = '';
    for (const item of textContent.items) {
      if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
        pageText += '\n';
        lastX = -1;
      } else if (lastX !== -1) {
        let gap = 0;
        if (item.transform[4] < lastX) {
           gap = lastX - (item.transform[4] + item.width);
        } else {
           gap = item.transform[4] - (lastX + lastW);
        }
        if (gap > 2) {
           pageText += ' ';
        }
      }
      pageText += item.str;
      lastY = item.transform[5];
      lastX = item.transform[4];
      lastW = item.width;
    }
    fullText += pageText + '\n\n';
  }
  return fixArabicLigatures(fullText);
}

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

const isFooterOrExaminerText = (text) => {
  const norm = text.toLowerCase().trim();
  const footerKeywords = [
    'إعداد', 'اعداد', 'إشراف', 'اشراف', 'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة',
    'توقيع', 'عضو اللجنة', 'الممتحن', 'المراجع', 'اللجنة الامتحانية', 'لجنة الاختبار',
    'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
    'ملاحظات', 'اسم المراجع', 'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز',
    'examiner', 'signature', 'prepared by', 'approved by', 'committee'
  ];
  if (footerKeywords.some(kw => norm.startsWith(kw) || (norm.length < 80 && norm.includes(kw)))) return true;
  const militaryRankRegex = /(?:^|\s)(?:عميد|عقيد|مقدم|رائد|نقيب|ملازم|لواء|فريق|مشير)(?:\s+أ\s*\.?\s*ح)?\s*[\/\s]/i;
  return militaryRankRegex.test(norm);
};

function parseMarkdownToQuestions(markdownText) {
  const questions = [];
  const lines = markdownText.split(/\r?\n/);
  
  let currentQText = '';
  let currentChoices = [];
  let currentCorrectAnswers = [];
  let currentExplanation = null;
  let hasCurrentHeader = false;

  const saveCurrentQuestion = () => {
    let qTextClean = currentQText.trim();
    if (!qTextClean) return;

    if (!hasCurrentHeader && currentChoices.length === 0) {
      currentQText = '';
      return;
    }

    qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
    qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*/i, '').trim();

    if (qTextClean && !isFooterOrExaminerText(qTextClean)) {
      let choices = [...currentChoices];
      if (choices.length === 0) {
        choices = [
          { id: 'A', label: 'A', text: 'صح / True' },
          { id: 'B', label: 'B', text: 'خطأ / False' }
        ];
      }
      questions.push({ text: qTextClean, choices });
    }

    currentQText = '';
    currentChoices = [];
    currentCorrectAnswers = [];
    currentExplanation = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('<!--') && line.endsWith('-->')) continue;

    const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();
    const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
    const isHeader = !!qHeaderMatch && (
      line.startsWith('#') || 
      /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
      /^\d+[\.\-\)]/i.test(line)
    );
    const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

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

    const choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

    if (isHeader && !choiceMatch && !answerKeyMatch) {
      saveCurrentQuestion();
      hasCurrentHeader = true;
      currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : cleanLine.replace(/^#+\s*/, '').trim();
      currentChoices = [];
      currentCorrectAnswers = [];
      currentExplanation = null;
    } else if (answerKeyMatch) {
      // skip
    } else if (choiceMatch) {
      currentChoices.push({ text: choiceMatch[2] });
    } else {
      if (currentChoices.length > 0) {
        currentChoices[currentChoices.length - 1].text += ' ' + cleanLine;
      } else {
        currentQText += (currentQText ? '\n' : '') + cleanLine;
      }
    }
  }
  saveCurrentQuestion();
  return questions;
}

async function run() {
  const fileData = new Uint8Array(fs.readFileSync('/Users/mahmoudreda/.gemini/antigravity/brain/b27d0922-110e-4d60-a3da-415178d315fb/.user_uploaded/media_1788807490114.pdf'));
  const text = await extractText(fileData);
  const questions = parseMarkdownToQuestions(text);
  console.log("Parsed", questions.length, "questions");
  if (questions.length === 0) {
    console.log("TEXT EXTRACTED:\n", text.slice(0, 500));
  }
}
run();
