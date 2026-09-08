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
    
    return this.fixArabicLigatures(fullText);
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

    return fixed;
  }
}
