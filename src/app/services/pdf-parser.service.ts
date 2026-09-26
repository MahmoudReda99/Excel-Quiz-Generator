import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root'
})
export class PdfParserService {
  constructor() {
    // Set the worker source to match the installed pdfjs-dist version via a public CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  async extractText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
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
            // Significant change in Y coordinate indicates a new line
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
        
        fullText += pageText + '\n\n';
      }
    }
    
    return this.fixArabicLigatures(fullText);
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

    return this.fixArabicLigatures(resultLines.join(' '));
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

  private fixArabicLigatures(str: string): string {
    // 1. Fix global bracket reversals common in Arabic PDF extractions
    // When extracted without proper BIDI formatting, '(' and ')' are swapped.
    let fixed = str.split('').map(char => {
      if (char === '(') return ')';
      if (char === ')') return '(';
      if (char === '[') return ']';
      if (char === ']') return '[';
      return char;
    }).join('');

    // 2. Fix definite article with Hamza reversals caused by PDF Lam-Alef ligature extraction issues
    // Covers prefixes: ا, وا, فا, با, كا
    // e.g. األقمار -> الأقمار, واإلضافة -> والإضافة
    fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])([وبفك]?)ا([أإآا])ل/g, '$1$2ال$3');
    
    // Fix li- prefix: لأل -> للأ
    fixed = fixed.replace(/(^|[\s،.؟!\-()\[\]])ل([أإآا])ل/g, '$1لل$2');
    
    // Fix Alif-Maksura + Lam reversal at the end of words: ىل -> لى
    // e.g. إىل -> إلى, عىل -> على
    fixed = fixed.replace(/ىل(?=[\s،.؟!\-()\[\]]|$)/g, 'لى');
    
    // Fix Tanween reversal: ًال -> لاً
    // e.g. سؤاًال -> سؤالاً
    fixed = fixed.replace(/ًال/g, 'لاً');
    
    // 3. Fix common internal "لا" ligatures extracted as "ال"
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
    
    // 4. Fix standalone words where 'لا' was reversed to 'ال'
    const standaloneReversals: Record<string, string> = {
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
      'كامال': 'كاملا',
      'شكال': 'شكلا',
      'فعاال': 'فعالا',
      'عاجال': 'عاجلا',
      'قابال': 'قابلا',
      'شامال': 'شاملا',
      'مفصال': 'مفصلا'
    };

    const standaloneWordsPattern = Object.keys(standaloneReversals).join('|');
    const standaloneRegex = new RegExp(`(^|[\\s،.؟!\\-()\\[\\]])(${standaloneWordsPattern})(?=[\\s،.؟!\\-()\\[\\]]|$)`, 'g');
    
    fixed = fixed.replace(standaloneRegex, (match, p1, p2) => {
      return p1 + standaloneReversals[p2];
    });

    // 5. Structural normalization for mangled / single-paragraph RTL PDF extractions
    // Remove Tatweel / Kashida (\u0640)
    fixed = fixed.replace(/\u0640/g, '');

    // Normalize True / False reversed pairs (e.g. حص ) أ أطخ ) ب)
    fixed = fixed.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) صح\n($2) خطأ\n');
    fixed = fixed.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n($1) خطأ\n($2) صح\n');
    fixed = fixed.replace(/(?:^|\s+)حص\s*[\(\)]\s*([أA])/gi, '\n($1) صح\n');
    fixed = fixed.replace(/(?:^|\s+)أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) خطأ\n');

    // Normalize Answer Key markers and strip preceding trailing choice labels
    fixed = fixed.replace(/([\(\)]?\s*[أبجدa-h1-8]\s*[\(\)]?|حص\s*[\(\)]?\s*[أA]\s*[\(\)]?|أطخ\s*[\(\)]?\s*[بB]\s*[\(\)]?)\s*[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: $1\n');
    fixed = fixed.replace(/[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: ');

    // Normalize question headers cleanly (both LTR & RTL reversed like الؤسلا 1 or 1 الؤسلا or لؤسملا 1 or السؤال 1)
    const headerRegex = /(?:[:\s]+(\d+)\s*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)|(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)\s*[:\s]*(\d+))/gi;
    fixed = fixed.replace(headerRegex, (m, p1, p2) => '\n\n#### السؤال ' + (p1 || p2) + ' :\n');

    // Normalize Choice markers like "( أ (" or "( أ )" or "أ(" or "( أ "
    fixed = fixed.replace(/[\(\)\[\]]\s*([أبجدa-h1-8])\s*[\(\)\[\]]/gi, '\n($1) ');
    fixed = fixed.replace(/(^|\s+)[\(\)\[\]]?\s*([أبجدa-h1-8])\s*[\(\)\[\]](?=\s*[\u0600-\u06FFa-zA-Z0-9])/gi, '\n($2) ');

    return fixed;
  }
}
