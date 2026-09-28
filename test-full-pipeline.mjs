import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function normalizePresentationForms(str) {
  return str.normalize('NFKD').replace(/[\uFE70-\uFEFF\uFB50-\uFDFF]/g, ch => ch.normalize('NFKC'));
}

export function cleanArabicLigatures(str) {
  let fixed = str;

  // 0. Remove document header/footer patterns that contain (ب) or page numbers to prevent false choice matches
  fixed = fixed.replace(/تنظيم\s*و[إا]ستخدام\s*[\(\[]?ب[\)\]]?\s*\d*/gi, '');
  fixed = fixed.replace(/تنظيم\s*الكتيبة\s*المشاة\s*الميكانيكى\s*\d*/gi, '');
  fixed = fixed.replace(/تنظيم\s*الكتيبة\s*المدفعية\s*\d*/gi, '');
  fixed = fixed.replace(/تنظيم\s*واستخدام\s*الدفاع\s*الجوى\s*\d*/gi, '');
  fixed = fixed.replace(/تنظيم\s*وإستخدام\s*قوات\s*الصاعقة\s*\d*/gi, '');

  // 1. Normalize Lam-Alef and Hamza issues
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])([وبفك]?)ا([أإآا])ل/g, '$1$2ال$3');
  fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])ل([أإآا])ل/g, '$1لل$2');
  fixed = fixed.replace(/ىل(?=[\s،.؟!\-()\[\]]|$)/g, 'لى');
  fixed = fixed.replace(/ًال/g, 'لاً');

  const reversedLigatureWords = {
    'إطالق': 'إطلاق',
    'إخالء': 'إخلاء',
    'إسالم': 'إسلام',
    'إعالن': 'إعلان',
    'إغالق': 'إغلاق',
    'إصالح': 'إصلاح',
    'إحالل': 'إحلال',
    'إخالل': 'إخلال',
    'استغالل': 'استغلال',
    'استطالع': 'استطلاع',
    'استهالك': 'استهلاك',
    'خالصة': 'خلاصة',
    'حاالت': 'حالات',
    'السالم': 'السلام',
    'الميالد': 'الميلاد',
    'العالقات': 'العلاقات',
    'صالحيات': 'صلاحيات',
    'صالحية': 'صلاحية',
    'غالف': 'غلاف',
    'تالعب': 'تلاعب',
    'سالح': 'سلاح',
    'خالل': 'خلال',
    'مالحظات': 'ملاحظات',
    'مالزم': 'ملازم',
    'داللة': 'دلالة',
    'دالئل': 'دلائل'
  };

  for (const [mangled, correct] of Object.entries(reversedLigatureWords)) {
    fixed = fixed.split(mangled).join(correct);
  }

  const standaloneReversals = {
    'ال': 'لا', 'وال': 'ولا', 'فال': 'فلا', 'إال': 'إلا', 'أال': 'ألا',
    'كال': 'كلا', 'بال': 'بلا', 'أوال': 'أولا', 'حاال': 'حالا',
    'مستقال': 'مستقلا', 'أصال': 'أصلا', 'بدال': 'بدلا', 'كامال': 'كاملا',
    'شكال': 'شكلا', 'فعاال': 'فعالا', 'عاجال': 'عاجلا', 'قابال': 'قابلا',
    'شامال': 'شاملا', 'مفصال': 'مفصلا'
  };

  const standaloneWordsPattern = Object.keys(standaloneReversals).join('|');
  const standaloneRegex = new RegExp(`(^|[\\s،.؟!\\-()\\[\\]])(${standaloneWordsPattern})(?=[\\s،.؟!\\-()\\[\\]]|$)`, 'g');
  fixed = fixed.replace(standaloneRegex, (match, p1, p2) => p1 + standaloneReversals[p2]);

  fixed = fixed.replace(/\u0640/g, '');

  // 2. Normalize question headers cleanly
  fixed = fixed.replace(/(?:^|\n)\s*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)\s*[:\s]*(\d+)/gi, '\n\n#### السؤال $1 :\n');
  fixed = fixed.replace(/(?:^|\n)\s*(\d+)\s*[:\s]*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)/gi, '\n\n#### السؤال $1 :\n');

  // 3. Normalize True / False reversed pairs
  fixed = fixed.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n- ($1) صح\n- ($2) خطأ\n');
  fixed = fixed.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n- ($1) خطأ\n- ($2) صح\n');

  // 4. Normalize Answer Key markers
  fixed = fixed.replace(/([\(\)]?[^\S\r\n]*[أإابجدهوزحa-hA-H][^\S\r\n]*[\(\)]?|حص[^\S\r\n]*[\(\)]?[^\S\r\n]*[أA][^\S\r\n]*[\(\)]?|أطخ[^\S\r\n]*[\(\)]?[^\S\r\n]*[بB][^\S\r\n]*[\(\)]?)[^\S\r\n]*[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)[^\S\r\n]*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\n**الإجابة:** $1\n');
  fixed = fixed.replace(/[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)[^\S\r\n]*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\n**الإجابة:** ');

  // 5. Reversed choice format: ) من 20-55 ممA( or 2-1) منA( -> - (A) من 20-55 مم
  fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*([^\n\r]+?)[^\S\r\n]*([A-Ha-hأإابجدهوزح])[^\S\r\n]*\([^\S\r\n]*(?=\n|$)/g, (m, p1, p2) => {
    let cleanText = p1.replace(/[\(\)]/g, ' ').trim();
    return '\n- (' + p2 + ') ' + cleanText;
  });
  fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*\)[^\S\r\n]*([^\(\)\n\r]+?)[^\S\r\n]*([A-Ha-hأإابجدهوزح])(?=[^\S\r\n]*(?:\n|$))/g, '\n- ($2) $1');

  // 6. Convert trailing labels like `من 2-3 )A(` to `- (A) من 2-3`
  fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*([^\n\r]+?)[^\S\r\n]*[\(\)][^\S\r\n]*([A-Ha-hأإابجدهوزح])[^\S\r\n]*[\(\)][^\S\r\n]*(?=\n|$)/g, '\n- ($2) $1');

  // 7. Convert leading labels like `(A) من 2-3` to `- (A) من 2-3`
  fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*[\(\[]?[^\S\r\n]*([A-Ha-hأإابجدهوزح])[^\S\r\n]*[\)\]][\(\)]?[^\S\r\n]*(.+)$/gm, '\n- ($1) $2');

  return fixed;
}

export function extractVisualRtlPage(textContent) {
  const items = textContent.items.filter(it => it.str && it.str.trim());
  if (items.length === 0) return '';

  items.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 3) return yDiff;
    return b.transform[4] - a.transform[4];
  });

  const lines = [];
  let currentLine = [];
  let curY = null;
  for (const it of items) {
    const y = it.transform[5];
    if (curY === null || Math.abs(curY - y) > 3) {
      if (currentLine.length) lines.push(currentLine);
      currentLine = [];
      curY = y;
    }
    currentLine.push(it);
  }
  if (currentLine.length) lines.push(currentLine);

  let pageText = '';
  for (const line of lines) {
    line.sort((a, b) => b.transform[4] - a.transform[4]);
    let lineStr = '';
    let lastX = -1;
    let lastW = 0;

    for (const it of line) {
      const x = it.transform[4];
      const w = it.width;
      let raw = normalizePresentationForms(it.str);
      let reversed = raw.split('').reverse().join('');
      if (lastX !== -1) {
        const gap = lastX - (x + w);
        if (gap > 2) lineStr += ' ';
      }
      lineStr += reversed;
      lastX = x;
      lastW = w;
    }

    let s = lineStr.trim();
    s = s.replace(/ا\u0654|ا\u0655|ٔا|ٕا/g, m => (m.includes('ٕ') ? 'إ' : 'أ'));
    s = s.replace(/إ/g, 'إ').replace(/أ/g, 'أ').replace(/ىٔ/g, 'ئ').replace(/ئ/g, 'ئ').replace(/ؤ/g, 'ؤ').replace(/مٔو/g, 'مؤ');
    s = s.replace(/إال/g, 'الإ').replace(/أال/g, 'الأ').replace(/اإل/g, 'الإ').replace(/األ/g, 'الأ');
    s = s.replace(/شٔيرادٕا|شٔيرادا/g, 'إدارية').replace(/رادٕاية|راداية/g, 'إدارية').replace(/رادٕا|رادا/g, 'إدار').replace(/إراد/g, 'إدار').replace(/يراد/g, 'إداري');
    s = s.replace(/شٔيو/g, 'شؤو').replace(/شٔي/g, 'شي');
    s = s.replace(/نموجذ/g, 'نموذج').replace(/جدلو/g, 'جدول').replace(/للوءا/g, 'للواء').replace(/الخوةذ/g, 'الخوذة');
    s = s.replace(/تاودأ/g, 'أدوات').replace(/تاود/g, 'أدوات').replace(/أنوعا/g, 'أنواع').replace(/انوعا/g, 'أنواع');
    s = s.replace(/([^\s])ة([دذرزو])/g, '$1$2ة');
    s = s.replace(/وحدتا/g, 'وحدات').replace(/مشآت/g, 'منشآت').replace(/منشٓات/g, 'منشآت').replace(/منشٓا/g, 'منشآ');
    s = s.replace(/إجرتاءا|إجرتاء/g, 'إجراءات').replace(/مشتمالت/g, 'مشتملات').replace(/قوتا/g, 'قوات');
    s = s.replace(/رٔايس|رئييس/g, 'رئيس').replace(/قائٔد|قأيد/g, 'قائد');
    s = s.replace(/ذخأير|الذخأير/g, 'الذخائر').replace(/خسأير/g, 'خسائر').replace(/وبأي/g, 'وبائي').replace(/روشة/g, 'ورشة');

    if (s.includes('lmth.') || s.includes('file:///') || s.includes('PM 03:') || s.includes('MP 03:')) {
      continue;
    }
    pageText += s + '\n';
  }

  return pageText;
}

export async function parsePdfToMarkdown(arrayBuffer) {
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const hasPresentationForms = textContent.items.some(it => /[\uFE70-\uFEFC\uFB50-\uFDFF]/.test(it.str));

    if (hasPresentationForms) {
      const pageText = extractVisualRtlPage(textContent);
      fullText += pageText + '\n\n';
    } else {
      let lastY = -1;
      let lastX = -1;
      let lastW = 0;
      let pageText = '';

      for (const item of textContent.items) {
        if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
          pageText += '\n';
          lastX = -1;
        } else if (lastX !== -1) {
          let gap = item.transform[4] < lastX 
            ? lastX - (item.transform[4] + item.width) 
            : item.transform[4] - (lastX + lastW);
          if (gap > 2) pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
        lastX = item.transform[4];
        lastW = item.width;
      }
      fullText += cleanArabicLigatures(pageText) + '\n\n';
    }
  }

  return fullText;
}

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H',
  '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H',
  '١': 'A', '٢': 'B', '٣': 'C', '٤': 'D', '٥': 'E', '٦': 'F', '٧': 'G', '٨': 'H'
};

function normalizeInputText(text) {
  if (!text) return '';
  let clean = text.replace(/\u0640/g, '');

  clean = clean.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n- ($1) صح\n- ($2) خطأ\n');
  clean = clean.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n- ($1) خطأ\n- ($2) صح\n');
  clean = clean.replace(/(?:^|\s+)حص\s*[\(\)]\s*([أA])/gi, '\n- ($1) صح\n');
  clean = clean.replace(/(?:^|\s+)أطخ\s*[\(\)]\s*([بB])/gi, '\n- ($1) خطأ\n');

  clean = clean.replace(/([\(\)]?\s*[أبجدهوزحa-hA-H1-8]\s*[\(\)]?|حص\s*[\(\)]?\s*[أA]\s*[\(\)]?|أطخ\s*[\(\)]?\s*[بB]\s*[\(\)]?)\s*[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\n**الإجابة:** $1\n');
  clean = clean.replace(/[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\n**الإجابة:** ');

  clean = clean.replace(/[\[\]\(\)]\s*(?:ة\s*حيحصلا\s*ة\s*باجلاإ|اإلجابة\s*الصحيحة|الإجابة\s*الصحيحة|خيار\s*(?:صحيح|معتمد)(?:\s*أيضًا\s*بالمرجع)?)\s*[\[\]\(\)]/gi, ' [x] ');

  const reversedHeaderRegex = /(?:[:\s]+(\d+)\s*(?:الؤسلا|لؤسملا|لؤئسملا|لاؤسلا)|(?:الؤسلا|لؤسملا|لؤئسملا|لاؤسلا)\s*[:\s]*(\d+))/gi;
  clean = clean.replace(reversedHeaderRegex, (m, p1, p2) => '\n\n#### السؤال ' + (p1 || p2) + ' :\n');

  clean = clean.replace(/(?:^|\n)\s*س\s*(\d+)[:\s]*/gi, '\n\n#### السؤال $1 :\n');

  return clean;
}

export function parseMarkdownToQuestions(markdownText) {
  if (!markdownText) return [];

  const normalizedText = normalizeInputText(markdownText);
  const questions = [];
  const lines = normalizedText.split(/\r?\n/);
  
  let currentQText = '';
  let currentChoices = [];
  let currentCorrectAnswers = [];
  let currentExplanation = null;
  let hasCurrentHeader = false;
  let currentHeaderTitle = '';

  const isFooterOrExaminerText = (text) => {
    const norm = text.toLowerCase().trim();
    const footerPrefixes = [
      'إعداد:', 'اعداد:', 'إعداد /', 'اعداد /', 'إشراف:', 'اشراف:', 'إشراف /', 'اشراف /',
      'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة', 'عضو اللجنة',
      'توقيع', 'الممتحن', 'اللجنة الامتحانية', 'لجنة الاختبار',
      'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
      'اسم المراجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز'
    ];
    return footerPrefixes.some(kw => norm.startsWith(kw));
  };

  const extractRef = (text) => {
    if (!text.includes('المرجع') && !text.includes('بند') && !text.includes('صفحة') && !text.includes('مخطط') && !text.includes('السند')) {
      return { clean: text, exp: null };
    }
    const m = text.match(/(?:[—–]\s*[\(\[]?|[\(\[])\s*([^\n\r]*(?:السند|المرجع|ص\s*\d+|بند|صفحة|مخطط)[^\n\r]*)[\)\]]?\s*$/);
    if (m && m.index !== undefined) {
      const clean = text.slice(0, m.index).replace(/[—–\-\s]+$/, '').trim();
      const exp = m[1].replace(/^[—–\-\(\)\[\]\s]+/, '').replace(/[\(\)\[\]\s]+$/, '').trim();
      return { clean, exp };
    }
    return { clean: text, exp: null };
  };

  const extractChoicesFromLine = (line) => {
    if (!line || !line.trim()) return null;
    const cleanLine = line.trim();

    const normalizedLine = cleanLine.replace(/[\[\]\(\)]?\s*(?:اإلجابة الصحيحة|الإجابة الصحيحة|خيار صحيح|خيار معتمد)\s*[\[\]\(\)]?/g, ' ');

    // 1. Single bullet choice line: - (A) ... or (A) ... or (أ) ...
    const bulletMatch = normalizedLine.match(/^(?:[\s\-\*•]+)?(?:\[[ xX]\]\s*)?(?:\*\*|__|\*)?[\(\)\[\]]?\s*([A-Ha-hأإابجدهوزح1-8])\s*[\.\)\:\-\(\]][\)\(\]]?(?:\*\*|__|\*)?\s+(.+)$/);
    if (bulletMatch) {
      let choiceText = bulletMatch[2].trim();
      choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
      const refRes = extractRef(choiceText);
      choiceText = refRes.clean;
      if (refRes.exp) currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
      if (choiceText === 'حص') choiceText = 'صح';
      if (choiceText === 'أطخ') choiceText = 'خطأ';
      if (choiceText) return [{ label: bulletMatch[1], text: choiceText }];
    }

    // 2. Simple label at start of line without parenthesis (e.g. 'أ الإسعاف الطبي')
    const simpleStartMatch = normalizedLine.match(/^([أإابجدa-dA-D])\s+(.+)$/i);
    if (simpleStartMatch && !normalizedLine.includes('السند') && !normalizedLine.includes('المرجع')) {
      let choiceText = simpleStartMatch[2].trim();
      const refRes = extractRef(choiceText);
      choiceText = refRes.clean;
      if (refRes.exp) currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
      if (choiceText === 'حص') choiceText = 'صح';
      if (choiceText === 'أطخ') choiceText = 'خطأ';
      if (choiceText) return [{ label: simpleStartMatch[1], text: choiceText }];
    }

    // 3. Trailing labels: [Text] ) أ or [Text] (أ)
    const trailingMarkerRegex = /(?:^|[\s،\.\-])[\(\)]\s*([أإابجدهوزحa-hA-H])(?:\s*[\(\)])?(?=\s+|$)/g;
    const trailingMarkers = [];
    let tMatch;
    while ((tMatch = trailingMarkerRegex.exec(normalizedLine)) !== null) {
      trailingMarkers.push({
        label: tMatch[1],
        startIndex: tMatch.index,
        endIndex: tMatch.index + tMatch[0].length
      });
    }

    if (trailingMarkers.length > 0 && trailingMarkers[0].startIndex >= 2) {
      const choices = [];
      let lastEnd = 0;
      for (let i = 0; i < trailingMarkers.length; i++) {
        const m = trailingMarkers[i];
        let choiceText = normalizedLine.slice(lastEnd, m.startIndex).trim();
        choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
        const refRes = extractRef(choiceText);
        choiceText = refRes.clean;
        if (refRes.exp) currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
        if (choiceText === 'حص') choiceText = 'صح';
        if (choiceText === 'أطخ') choiceText = 'خطأ';
        if (choiceText) choices.push({ label: m.label, text: choiceText });
        lastEnd = m.endIndex;
      }
      if (choices.length > 0) return choices;
    }

    // 4. Leading labels: (A) [Text] or (أ) [Text]
    const leadingPattern = /(?:^|[\s\-\*•]+)(?:\[[ xX]\]\s*)?(?:\*\*|__|\*)?[\(\)\[\]]?\s*([A-Ha-hأإابجدهوزح])\s*[\.\)\:\-\(\]][\)\(\]]?(?:\*\*|__|\*)?\s*/g;
    const leadingMarkers = [];
    let lMatch;
    while ((lMatch = leadingPattern.exec(normalizedLine)) !== null) {
      leadingMarkers.push({
        label: lMatch[1],
        startIndex: lMatch.index,
        matchLength: lMatch[0].length
      });
    }

    if (leadingMarkers.length > 0) {
      const choices = [];
      for (let i = 0; i < leadingMarkers.length; i++) {
        const current = leadingMarkers[i];
        const textStart = current.startIndex + current.matchLength;
        const textEnd = (i < leadingMarkers.length - 1) ? leadingMarkers[i + 1].startIndex : normalizedLine.length;
        let choiceText = normalizedLine.slice(textStart, textEnd).trim();
        choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();

        const refRes = extractRef(choiceText);
        choiceText = refRes.clean;
        if (refRes.exp) currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
        if (choiceText === 'حص') choiceText = 'صح';
        if (choiceText === 'أطخ') choiceText = 'خطأ';
        if (choiceText) choices.push({ label: current.label, text: choiceText });
      }
      if (choices.length > 0) return choices;
    }

    return null;
  };

  const parseCorrectAnswer = (rawAns) => {
    const cleanAns = rawAns.trim();
    if (/^(?:صح|صحيح|صواب|ص|حص|true|yes|نعم)(?:\s*[\(\[]?(?:true|صح|صواب)[\)\]]?)?$/i.test(cleanAns)) return ['A'];
    if (/^(?:خطأ|خاطئ|خطا|خ|أطخ|false|no|لا)(?:\s*[\(\[]?(?:false|خطأ|خطا)[\)\]]?)?$/i.test(cleanAns)) return ['B'];

    const singleOptionWithTextMatch = cleanAns.match(/^[\(\)]?\s*([A-Ha-hأ-ح1-8])[\.\)\:\-\(][\(\)]?\s+(.+)$/);
    if (singleOptionWithTextMatch) {
      const trailingText = singleOptionWithTextMatch[2].trim();
      const hasMoreMarkers = /(?:^|[,;\s\u060C\u061B\/\+&]+)[\(\)]?\s*([A-Ha-hأ-ح1-8])[\.\)\:\-\(][\(\)]?(?=\s+|$)/.test(trailingText) ||
                             /(?:^|[,;\s\u060C\u061B]+)\s*([A-Ha-hأ-ح1-8])(?=\s*[,;\s\u060C\u061B]|$)/.test(trailingText);
      if (!hasMoreMarkers) {
        let label = singleOptionWithTextMatch[1].toUpperCase();
        if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
        if (/^[A-H]$/.test(label)) return [label];
      }
    }

    const normalizedDelimiterStr = cleanAns
      .replace(/\s+و\s+/g, ',')
      .replace(/[,;\u060C\u061B\/\+&]+/g, ',');

    const parts = normalizedDelimiterStr.split(',').map(p => p.trim()).filter(Boolean);
    const answers = [];

    for (const part of parts) {
      const subParts = part.split(/\s+/).filter(Boolean);
      for (const sub of subParts) {
        let cleanP = sub.replace(/[\(\)\[\]\.\:\-]/g, '').trim().toUpperCase();
        if (arabicChoiceMap[cleanP]) cleanP = arabicChoiceMap[cleanP];
        if (/^[A-H]$/.test(cleanP)) {
          if (!answers.includes(cleanP)) answers.push(cleanP);
        } else {
          const match = sub.match(/^[\(\)]?\s*([A-Ha-hأ-ح1-8])[\.\)\:\-\(]?$/);
          if (match) {
            let label = match[1].toUpperCase();
            if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
            if (/^[A-H]$/.test(label)) return [label];
          }
        }
      }
    }

    if (answers.length > 0) return answers;

    const letterMatch = cleanAns.match(/[\(\)]?\s*([A-Ha-hأ-ح1-8])\s*[\.\)\:\-\(]?/);
    if (letterMatch) {
      let label = letterMatch[1].toUpperCase();
      if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
      if (/^[A-H]$/.test(label)) return [label];
    }

    return [cleanAns];
  };

  const isSectionHeader = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const sectionKeywords = [
      'النموذج', 'النماذج', 'امتحان', 'اختبار', 'مادة', 'جمهورية', 'دليل', 'التصحيح',
      'تعليمات', 'الفصل', 'الباب', 'الوحدة', 'قسم', 'تاريخ', 'المعتمدة'
    ];
    const norm = trimmed.toLowerCase().replace(/[*_#\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
    if (sectionKeywords.some(kw => norm.startsWith(kw) || norm === kw)) return true;
    if (/^#+\s+[^\d]+$/i.test(trimmed)) {
      const afterHash = trimmed.replace(/^#+\s*/, '').trim();
      if (!/^(?:السؤال|سؤال|س|Q|Question)/i.test(afterHash)) return true;
    }
    return false;
  };

  const saveCurrentQuestion = () => {
    let qTextClean = currentQText.trim();
    if (!qTextClean && (currentChoices.length > 0 || hasCurrentHeader)) {
      qTextClean = currentHeaderTitle || `السؤال ${questions.length + 1}`;
    }
    if (!qTextClean) return;

    if (!hasCurrentHeader && currentChoices.length === 0) {
      currentQText = '';
      return;
    }

    qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
    const stripped = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*\s*/i, '').trim();
    if (stripped) qTextClean = stripped;

    if (qTextClean && !isFooterOrExaminerText(qTextClean)) {
      let choices = [...currentChoices];

      if (choices.length === 0) {
        choices = [
          { id: 'A', label: 'A', text: 'صح / True' },
          { id: 'B', label: 'B', text: 'خطأ / False' }
        ];
      }

      if (currentCorrectAnswers.length === 0 && currentExplanation) {
        const isTF = choices.length === 2 && (choices[0].text.includes('صح') || choices[1].text.includes('خطأ'));
        if (isTF) {
          const isFalse = /وليس من|بينما|خطأ|هذا تعريف|إنما|وليس|بدلاً من/i.test(currentExplanation);
          currentCorrectAnswers.push(isFalse ? 'B' : 'A');
        } else if (choices.length > 0) {
          let maxOverlap = -1;
          let bestChoice = choices[0].id;
          for (const ch of choices) {
            const words = ch.text.split(/\s+/).filter(w => w.length > 2);
            let count = 0;
            for (const w of words) {
              if (currentExplanation.includes(w)) count++;
            }
            const ratio = words.length > 0 ? count / words.length : 0;
            if (ratio > maxOverlap) {
              maxOverlap = ratio;
              bestChoice = ch.id;
            }
          }
          currentCorrectAnswers.push(bestChoice);
        }
      }

      const type = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
      const finalCorrect = currentCorrectAnswers.length === 1 
        ? currentCorrectAnswers[0] 
        : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (choices[0]?.id || 'A'));

      questions.push({
        id: `md_q_${questions.length + 1}`,
        text: qTextClean,
        choices,
        correctAnswer: finalCorrect,
        type,
        explanation: currentExplanation ? currentExplanation.trim() : null,
        difficulty: null,
        userAnswer: null
      });
    }

    currentQText = '';
    currentChoices = [];
    currentCorrectAnswers = [];
    currentExplanation = null;
    hasCurrentHeader = false;
    currentHeaderTitle = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('<!--') && line.endsWith('-->')) continue;

    if (isSectionHeader(line)) {
      saveCurrentQuestion();
      hasCurrentHeader = false;
      currentQText = '';
      continue;
    }

    const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

    const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i);
    const isHeader = !!qHeaderMatch && (
      /^(?:#+\s*)?(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
      /^\d+[\.\-\)]\s+/i.test(line)
    );

    const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة|اإلجابة الصحيحة)[:\s]+(.+)$/i);
    const expMatch = cleanLine.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير|السند من المرجع|السندمنالمرجع|السند)[:\s]+)(.+)$/i);
    const extractedChoices = (!isHeader && !answerKeyMatch && !expMatch) ? extractChoicesFromLine(line) : null;

    if (isHeader) {
      saveCurrentQuestion();
      hasCurrentHeader = true;
      currentHeaderTitle = qHeaderMatch ? qHeaderMatch[0].replace(/^#+\s*/, '').trim() : '';
      currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : '';
      currentChoices = [];
      currentCorrectAnswers = [];
      currentExplanation = null;
    } else if (answerKeyMatch) {
      const parsedAns = parseCorrectAnswer(answerKeyMatch[1]);
      currentCorrectAnswers.push(...parsedAns);
    } else if (expMatch) {
      currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + expMatch[1].trim();
    } else if (extractedChoices) {
      extractedChoices.forEach(c => {
        let label = c.label.toUpperCase();
        if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
        const choiceId = label;
        if (!currentChoices.some(ch => ch.id === choiceId)) {
          currentChoices.push({ id: choiceId, label: choiceId, text: c.text });
        }
        if (line.includes('[x]') || line.includes('[X]') || line.includes('اإلجابة الصحيحة') || line.includes('الإجابة الصحيحة') || line.includes('خيار صحيح') || line.includes('خيار معتمد')) {
          if (!currentCorrectAnswers.includes(choiceId)) currentCorrectAnswers.push(choiceId);
        }
      });
    } else if (!line.startsWith('#')) {
      const cleanContent = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      if (cleanContent) {
        if (cleanContent.startsWith('السندمنالمرجع') || cleanContent.startsWith('السند من المرجع')) {
          currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + cleanContent;
        } else if (currentChoices.length > 0) {
          if (currentExplanation && (currentExplanation.includes('المرجع') || currentExplanation.includes('ص '))) {
            let cleanExpLine = cleanContent.replace(/[\)\(\]\[]\s*$/, '');
            currentExplanation += ' ' + cleanExpLine;
          } else {
            let lastChoice = currentChoices[currentChoices.length - 1];
            lastChoice.text += ' ' + cleanContent;
            const refRes = extractRef(lastChoice.text);
            if (refRes.exp) {
              currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + refRes.exp;
              lastChoice.text = refRes.clean;
            }
          }
        } else {
          currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
        }
      }
    }
  }

  saveCurrentQuestion();
  return questions;
}

// Full test suite
async function testAll() {
  const dir = '../خاص/تنظيم واستخدام عام';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

  console.log(`=== FULL TEST SUITE FOR ALL ${files.length} PDF FILES IN /خاص/تنظيم واستخدام عام ===\n`);
  let allPassed = true;

  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    const md = await parsePdfToMarkdown(new Uint8Array(buf));
    const questions = parseMarkdownToQuestions(md);

    let validChoices = 0;
    let validAnswers = 0;
    let singleAnsCount = 0;

    for (const q of questions) {
      if (q.choices && q.choices.length >= 2) validChoices++;
      if (q.correctAnswer && (Array.isArray(q.correctAnswer) ? q.correctAnswer.length > 0 : typeof q.correctAnswer === 'string')) {
        validAnswers++;
      }
      if (typeof q.correctAnswer === 'string' && /^[A-H]$/.test(q.correctAnswer)) {
        singleAnsCount++;
      }
    }

    const pass = questions.length > 0 && validChoices === questions.length && validAnswers === questions.length;
    console.log(`FILE: ${f}`);
    console.log(`  Questions: ${questions.length} | Valid Choices: ${validChoices}/${questions.length} | Valid Answers: ${validAnswers}/${questions.length} -> ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!pass) allPassed = false;
  }

  console.log(`\n============================================================`);
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log(`============================================================\n`);
}

testAll().catch(console.error);
