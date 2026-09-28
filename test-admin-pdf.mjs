import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const filePath = '../خاص/تنظيم واستخدام عام/‎⁨حل نماذج امتحانات مادة شئون إدارية⁩.pdf';
const data = new Uint8Array(fs.readFileSync(filePath));
const loadingTask = pdfjs.getDocument({ data });
const pdf = await loadingTask.promise;

function normalizePresentationForms(str) {
  return str.normalize('NFKD').replace(/[\uFE70-\uFEFF\uFB50-\uFDFF]/g, ch => ch.normalize('NFKC'));
}

function cleanArabic(str) {
  let s = str;
  s = s.replace(/ا\u0654|ا\u0655|ٔا|ٕا/g, m => (m.includes('ٕ') ? 'إ' : 'أ'));
  s = s.replace(/إ/g, 'إ').replace(/أ/g, 'أ').replace(/ىٔ/g, 'ئ').replace(/ئ/g, 'ئ').replace(/ؤ/g, 'ؤ').replace(/مٔو/g, 'مؤ');
  s = s.replace(/إال/g, 'الإ').replace(/أال/g, 'الأ').replace(/اإل/g, 'الإ').replace(/األ/g, 'الأ');
  s = s.replace(/شٔيرادٕا|شٔيرادا/g, 'إدارية').replace(/رادٕاية|راداية/g, 'إدارية').replace(/رادٕا|رادا/g, 'إدار').replace(/إراد/g, 'إدار').replace(/يراد/g, 'إداري');
  s = s.replace(/شٔيو/g, 'شؤو').replace(/شٔي/g, 'شي');
  s = s.replace(/نموجذ/g, 'نموذج');
  s = s.replace(/جدلو/g, 'جدول');
  s = s.replace(/للوءا/g, 'للواء');
  s = s.replace(/الخوةذ/g, 'الخوذة');
  s = s.replace(/تاودأ/g, 'أدوات').replace(/تاود/g, 'أدوات');
  s = s.replace(/أنوعا/g, 'أنواع').replace(/انوعا/g, 'أنواع');
  s = s.replace(/([^\s])ة([دذرزو])/g, '$1$2ة');
  s = s.replace(/وحدتا/g, 'وحدات').replace(/مشآت/g, 'منشآت').replace(/منشٓات/g, 'منشآت').replace(/منشٓا/g, 'منشآ');
  s = s.replace(/إجرتاءا|إجرتاء/g, 'إجراءات');
  s = s.replace(/مشتمالت/g, 'مشتملات');
  s = s.replace(/قوتا/g, 'قوات');
  s = s.replace(/رٔايس|رئييس/g, 'رئيس').replace(/قائٔد|قأيد/g, 'قائد');
  s = s.replace(/ذخأير|الذخأير/g, 'الذخائر').replace(/خسأير/g, 'خسائر').replace(/وبأي/g, 'وبائي');
  s = s.replace(/روشة/g, 'ورشة');
  return s;
}

let fullDocText = '';

for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const textContent = await page.getTextContent();
  
  const items = textContent.items.filter(it => it.str && it.str.trim());
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

  for (const line of lines) {
    line.sort((a, b) => b.transform[4] - a.transform[4]);
    
    let lineText = '';
    let lastX = -1;
    let lastW = 0;
    
    for (const it of line) {
      const x = it.transform[4];
      const w = it.width;
      let raw = normalizePresentationForms(it.str);
      let reversed = raw.split('').reverse().join('');
      
      if (lastX !== -1) {
        const gap = lastX - (x + w);
        if (gap > 2) {
          lineText += ' ';
        }
      }
      lineText += reversed;
      lastX = x;
      lastW = w;
    }
    
    const cleanLine = cleanArabic(lineText).trim();
    if (cleanLine.includes('lmth.') || cleanLine.includes('file:///') || cleanLine.includes('PM 03:') || cleanLine.includes('MP 03:')) {
      continue;
    }
    fullDocText += cleanLine + '\n';
  }
  fullDocText += '\n';
}

const qRegex = /(?:^|\n)\s*س\s*(\d+)[:\s]*(.*?)(?=(?:\n\s*س\s*\d+|\n\s*نموذج|\n\s*اسم المادة|$))/gs;
const matches = [...fullDocText.matchAll(qRegex)];

let detectedAnswers = 0;
console.log(`Parsed ${matches.length} questions from 28 pages.`);
for (let i = 0; i < Math.min(5, matches.length); i++) {
  const qNum = matches[i][1];
  const block = matches[i][2].trim();
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  
  let qText = '';
  const choices = [];
  let refText = '';
  
  for (const l of lines) {
    const chMatch = l.match(/^([أ-دa-d])\s+(.+)$/i);
    if (chMatch) {
      choices.push({ label: chMatch[1], text: chMatch[2].trim() });
    } else if (l.includes('السند') || l.includes('المرجع') || refText) {
      refText += ' ' + l;
    } else if (choices.length === 0) {
      qText += ' ' + l;
    }
  }

  let ans = 'A';
  const isTF = choices.length === 2 && (choices[0].text.includes('صح') || choices[1].text.includes('خطأ'));
  if (isTF) {
    const isFalse = /وليس من|بينما|خطأ|هذا تعريف|إنما|وليس|بدلاً من/i.test(refText);
    ans = isFalse ? 'B' : 'A';
  } else if (choices.length > 0) {
    let maxOverlap = 0;
    let bestChoice = 'A';
    for (const ch of choices) {
      const words = ch.text.split(/\s+/).filter(w => w.length > 2);
      let count = 0;
      for (const w of words) {
        if (refText.includes(w)) count++;
      }
      const ratio = words.length > 0 ? count / words.length : 0;
      if (ratio > maxOverlap) {
        maxOverlap = ratio;
        bestChoice = ch.label;
      }
    }
    ans = bestChoice;
  }
  console.log(`Q${qNum}: Ans=${ans}, Choices=${choices.length}, Ref=${refText.slice(0, 50)}...`);
}
