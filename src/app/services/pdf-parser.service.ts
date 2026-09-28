import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root'
})
export class PdfParserService {
  constructor() {
    // Set the worker source to match the installed pdfjs-dist version via a public CDN in browser environment
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
  }

  async extractText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    return this.extractTextFromArrayBuffer(new Uint8Array(arrayBuffer));
  }

  async extractTextFromArrayBuffer(arrayBuffer: Uint8Array): Promise<string> {
    const cMapUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`;
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: cMapUrl,
      cMapPacked: true
    });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const hasPresentationForms = textContent.items.some((it: any) => /[\uFE70-\uFEFC\uFB50-\uFDFF]/.test(it.str));

      if (hasPresentationForms) {
        const pageText = this.extractVisualRtlPage(textContent);
        fullText += pageText + '\n\n';
      } else {
        const items = (textContent.items as any[])
          .map(it => ({
            str: it.str,
            x: it.transform[4],
            y: it.transform[5],
            w: it.width,
            h: it.height || 10
          }))
          .filter(it => it.str && it.str.trim().length > 0);

        const tableMd = this.extractPageTable(items, viewport.width);
        if (tableMd) {
          fullText += tableMd + '\n\n';
        } else {
          let lastY = -1;
          let lastX = -1;
          let lastW = 0;
          let pageText = '';
          
          for (const item of textContent.items as any[]) {
            if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
              pageText += '\n';
              lastX = -1;
            } else if (lastX !== -1) {
              let gap = 0;
              if (item.transform[4] < lastX) {
                // RTL: Previous character is to the right of current character.
                gap = lastX - (item.transform[4] + item.width);
              } else {
                // LTR: Previous character is to the left of current character.
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
          
          fullText += this.cleanArabicLigatures(pageText) + '\n\n';
        }
      }
    }
    
    return fullText;
  }

  private normalizePresentationForms(str: string): string {
    return str.normalize('NFKD').replace(/[\uFE70-\uFEFF\uFB50-\uFDFF]/g, ch => ch.normalize('NFKC'));
  }

  extractVisualRtlPage(textContent: any): string {
    const items = (textContent.items as any[]).filter(it => it.str && it.str.trim());
    if (items.length === 0) return '';

    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 3) return yDiff;
      return b.transform[4] - a.transform[4];
    });

    const lines: any[][] = [];
    let currentLine: any[] = [];
    let curY: number | null = null;
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
        const raw = this.normalizePresentationForms(it.str);
        const reversed = raw.split('').reverse().join('');
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

  private assembleLineText(items: any[]): string {
    if (!items || items.length === 0) return '';
    const lines: Array<{ y: number; items: any[] }> = [];
    const sorted = [...items].sort((a, b) => b.y - a.y);
    for (const it of sorted) {
      let placed = false;
      for (const line of lines) {
        if (Math.abs(line.y - it.y) <= 4) {
          line.items.push(it);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lines.push({ y: it.y, items: [it] });
      }
    }

    const resultLines = lines.map(line => {
      line.items.sort((a, b) => b.x - a.x);
      return line.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
    });

    return this.cleanArabicLigatures(resultLines.join(' '));
  }

  private extractPageTable(items: any[], viewportWidth: number): string | null {
    const rightNumbers = items
      .filter(it => it.x > viewportWidth * 0.6 && /^\d+$/.test(it.str.trim()))
      .sort((a, b) => b.y - a.y);

    if (rightNumbers.length < 3) return null;

    let markdown = '';

    for (let i = 0; i < rightNumbers.length; i++) {
      const cur = rightNumbers[i];
      const prev = i > 0 ? rightNumbers[i - 1] : null;
      const next = i < rightNumbers.length - 1 ? rightNumbers[i + 1] : null;

      const topY = prev ? (prev.y + cur.y) / 2 : (next ? cur.y + (cur.y - next.y) / 2 : cur.y + 25);
      const bottomY = next ? (cur.y + next.y) / 2 : (prev ? cur.y - (prev.y - cur.y) / 2 : cur.y - 25);

      const rowItems = items.filter(it => it.y <= topY && it.y > bottomY && it !== cur);

      const hasTFAnswer = rowItems.some(it => it.x < 70 && /^(?:true|false|صح|خطأ)$/i.test(it.str.trim()));
      const hasMCQAnswer = rowItems.some(it => it.x >= 350 && it.x < 400 && /^[A-D]$/i.test(it.str.trim()));

      const qNum = parseInt(cur.str.trim(), 10);

      if (hasTFAnswer || (!hasMCQAnswer && rowItems.some(it => it.x < 70))) {
        const ansItems = rowItems.filter(it => it.x < 70);
        const qItems = rowItems.filter(it => it.x >= 70);
        const rawAns = ansItems.map(it => it.str.trim().toLowerCase()).join(' ');
        let ansKey = 'A';
        if (rawAns.includes('false') || rawAns.includes('خطأ')) {
          ansKey = 'B';
        }
        const qText = this.assembleLineText(qItems);
        if (qText) {
          markdown += `\n\n#### السؤال ${qNum} :\n${qText}\n- (A) صح\n- (B) خطأ\n**الإجابة:** ${ansKey}\n`;
        }
      } else {
        const qItems = rowItems.filter(it => it.x >= 395);
        const ansItems = rowItems.filter(it => it.x >= 350 && it.x < 395);
        const aItems = rowItems.filter(it => it.x >= 270 && it.x < 350);
        const bItems = rowItems.filter(it => it.x >= 190 && it.x < 270);
        const cItems = rowItems.filter(it => it.x >= 115 && it.x < 190);
        const dItems = rowItems.filter(it => it.x < 115);

        const qText = this.assembleLineText(qItems);
        const ansKey = ansItems.map(it => it.str.trim().toUpperCase()).join('') || 'A';
        const choiceA = this.assembleLineText(aItems);
        const choiceB = this.assembleLineText(bItems);
        const choiceC = this.assembleLineText(cItems);
        const choiceD = this.assembleLineText(dItems);

        if (qText) {
          markdown += `\n\n#### السؤال ${qNum} :\n${qText}\n`;
          if (choiceA) markdown += `- (A) ${choiceA}\n`;
          if (choiceB) markdown += `- (B) ${choiceB}\n`;
          if (choiceC) markdown += `- (C) ${choiceC}\n`;
          if (choiceD) markdown += `- (D) ${choiceD}\n`;
          markdown += `**الإجابة:** ${ansKey}\n`;
        }
      }
    }

    return markdown;
  }

  cleanArabicLigatures(str: string): string {
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

    const reversedLigatureWords: Record<string, string> = {
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

    const standaloneReversals: Record<string, string> = {
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
}
