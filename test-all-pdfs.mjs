import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function normalizePresentationForms(str) {
  return str.normalize('NFKD').replace(/[\uFE70-\uFEFF\uFB50-\uFDFF]/g, ch => ch.normalize('NFKC'));
}

function cleanArabicLigatures(str) {
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
  fixed = fixed.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) صح\n($2) خطأ\n');
  fixed = fixed.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n($1) خطأ\n($2) صح\n');
  fixed = fixed.replace(/(?:^|\s+)حص\s*[\(\)]\s*([أA])/gi, '\n($1) صح\n');
  fixed = fixed.replace(/(?:^|\s+)أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) خطأ\n');

  fixed = fixed.replace(/([\(\)]?\s*[أبجدa-h1-8]\s*[\(\)]?|حص\s*[\(\)]?\s*[أA]\s*[\(\)]?|أطخ\s*[\(\)]?\s*[بB]\s*[\(\)]?)\s*[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: $1\n');
  fixed = fixed.replace(/[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: ');

  fixed = fixed.replace(/(?:^|\n)\s*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)\s*[:\s]*(\d+)/gi, '\n\n#### السؤال $1 :\n');
  fixed = fixed.replace(/(?:^|\n)\s*(\d+)\s*[:\s]*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)/gi, '\n\n#### السؤال $1 :\n');

  fixed = fixed.replace(/[\(\)\[\]]\s*([أبجدa-h1-8])\s*[\(\)\[\]]/gi, '\n($1) ');
  fixed = fixed.replace(/(^|\s+)[\(\)\[\]]?\s*([أبجدa-h1-8])\s*[\(\)\[\]](?=\s*[\u0600-\u06FFa-zA-Z0-9])/gi, '\n($2) ');

  return fixed;
}

function extractVisualRtlPage(textContent) {
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
    // Clean specific visual artifacts
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

// Quick test run
async function runAll() {
  const dir = '../خاص/تنظيم واستخدام عام';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    const md = await parsePdfToMarkdown(new Uint8Array(buf));
    console.log(`=== ${f} ===\nExtracted Markdown length: ${md.length}`);
    const qCount = (md.match(/####\s*السؤال\s*\d+|س\s*\d+/gi) || []).length;
    console.log(`Questions found: ${qCount}`);
  }
}

runAll().catch(console.error);
