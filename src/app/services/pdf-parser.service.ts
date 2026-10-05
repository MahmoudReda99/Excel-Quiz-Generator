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

      const items = (textContent.items as any[])
        .map(it => ({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5],
          w: it.width,
          h: it.height || 10
        }))
        .filter(it => it.str && it.str.trim().length > 0);

      // 1. Try tabular extraction first
      const tableMd = this.extractPageTable(items, viewport.width);
      if (tableMd) {
        fullText += tableMd + '\n\n';
      } 
      // 2. Try Visual RTL extraction for print-to-pdf pages
      else if (this.isVisualRtlPage(textContent)) {
        const pageText = this.extractVisualRtlPage(textContent);
        fullText += pageText + '\n\n';
      } 
      // 3. Fallback to normal text extraction
      else {
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
    
    return fullText;
  }

  isVisualRtlPage(textContent: any): boolean {
    const items = textContent?.items || [];
    if (items.length === 0) return false;

    // Check for strong presentation forms (excluding standard Lam-Alef \uFEFB-\uFEFC which appear in normal PDFs)
    if (items.some((it: any) => /[\uFE70-\uFEFA\uFB50-\uFDFF]/.test(it.str))) return true;

    // Check for clearly reversed words (exact match or surrounded by spaces)
    const reversedPattern = /(?:^|\s)(?:لاؤسلا|لؤسملا|الؤسلا|ةحيحصلا|باجلاإ|ةباجإلا|جذامنلا|طابض|ةدام|كونب|ةلئسألا|ميظنت|مادختسا|ةيرس|ةبيتك|ةكرعم|نارين|ةيعفدم|ةقعاص|هاشم|يكيناكيم|عافد)(?:\s|$)/;
    if (items.some((it: any) => reversedPattern.test(it.str))) return true;

    // "موجه" is a special case as it is part of "الموجهة", so we check for exact match only
    if (items.some((it: any) => it.str === 'موجه')) return true;

    return false;
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
        let reversed = raw.split('').reverse().join('');
        // Re-reverse contiguous ASCII alpha/digit sequences (like 71 -> 17, 5.2 -> 2.5)
        reversed = reversed.replace(/[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*/g, m => m.split('').reverse().join(''));
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
      s = s.replace(/شٔيرادٕا|شٔيرادا/g, 'شؤون إدارية').replace(/رادٕاية|راداية|رادإية/g, 'إدارية').replace(/رادٕا|رادا/g, 'إدار').replace(/إراد/g, 'إدار').replace(/يراد/g, 'إداري');
      s = s.replace(/إىراد|إىإدار/g, 'إداري').replace(/الإىراد|الإىإدار/g, 'الإداري');
      s = s.replace(/شٔيو/g, 'شؤو').replace(/شٔي/g, 'شي');
      s = s.replace(/نموجذ/g, 'نموذج').replace(/جدلو/g, 'جدول').replace(/للوءا/g, 'للواء').replace(/الخوةذ/g, 'الخوذة');
      s = s.replace(/تاودأ/g, 'أدوات').replace(/تاود/g, 'أدوات').replace(/أنوعا/g, 'أنواع').replace(/انوعا/g, 'أنواع');
      s = s.replace(/([^\s])ة([دذرزو])/g, '$1$2ة');
      s = s.replace(/وحدتا/g, 'وحدات').replace(/مشآت/g, 'منشآت').replace(/منشٓات/g, 'منشآت').replace(/منشٓا/g, 'منشآ');
      s = s.replace(/إجرتاءا|إجرتاء/g, 'إجراءات').replace(/مشتمالت/g, 'مشتملات').replace(/قوتا/g, 'قوات');
      s = s.replace(/رٔايس|رئييس|رٔييس/g, 'رئيس').replace(/قائٔد|قأيد|القأيد/g, 'القائد').replace(/سأيقين/g, 'سائقين');
      s = s.replace(/ذخأير|الذخأير/g, 'الذخائر').replace(/خسأير|الخسأير/g, 'الخسائر').replace(/وبأي|الوبأيية/g, 'الوبائية').replace(/الوقأيية|الوقأيي/g, 'الوقائية').replace(/خصأيص/g, 'خصائص');
      s = s.replace(/الخيانار/g, 'الخياران').replace(/اودٔير/g, 'تدوير').replace(/المررو/g, 'المرور').replace(/المخانز/g, 'المخازن');
      s = s.replace(/إعددا/g, 'إعداد').replace(/أفردا/g, 'أفراد').replace(/المحارو/g, 'المحاور').replace(/الحددو/g, 'الحدود').replace(/الكفاةء/g, 'الكفاءة');
      s = s.replace(/الأتبادلي/g, 'التبادلي').replace(/الأحفر/g, 'الحفر').replace(/اوإلرادية/g, 'والإدارية');

      if (s.includes('lmth.') || s.includes('file:///') || s.includes('PM 03:') || s.includes('MP 03:') || s.includes('```foe') || s.includes('ملخص الإنجاز') || s.includes('اسم المادة :')) {
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

  /**
   * Detect the page layout type and column positions dynamically.
   * Returns null if the page is not a tabular question page.
   */
  private detectPageLayout(items: any[], viewportWidth: number): {
    type: 'tf' | 'mcq';
    qNumItems: any[];
    qNumX: number;
    ansX: number;
    /** For TF: X threshold below which true/false answers appear */
    tfAnsThreshold?: number;
    /** For MCQ: detected choice column boundaries */
    choiceBoundaries?: number[];
  } | null {
    // Strategy: Find all standalone integer items that could be question numbers.
    // They are typically in a consistent X-column, appearing in a vertical sequence.
    const numberItems = items
      .filter(it => /^\d+$/.test(it.str.trim()) && parseInt(it.str.trim(), 10) >= 1 && parseInt(it.str.trim(), 10) <= 300)
      .sort((a, b) => b.y - a.y);

    if (numberItems.length < 3) return null;

    // Group number items by their X position (within tolerance of 15px)
    const xGroups: Map<number, any[]> = new Map();
    for (const it of numberItems) {
      let placed = false;
      for (const [groupX, group] of xGroups) {
        if (Math.abs(it.x - groupX) < 15) {
          group.push(it);
          placed = true;
          break;
        }
      }
      if (!placed) {
        xGroups.set(it.x, [it]);
      }
    }

    // The question number column is the group with the most items
    let bestGroupX = 0;
    let bestGroup: any[] = [];
    for (const [groupX, group] of xGroups) {
      if (group.length > bestGroup.length) {
        bestGroup = group;
        bestGroupX = groupX;
      }
    }

    if (bestGroup.length < 3) return null;

    // Check for sequential numbering to confirm these are question numbers
    const nums = bestGroup.map(it => parseInt(it.str.trim(), 10)).sort((a, b) => a - b);
    let sequential = 0;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === nums[i - 1] + 1) sequential++;
    }
    if (sequential < 2) return null; // Need at least 3 sequential numbers

    const qNumX = bestGroupX;
    const qNumItems = bestGroup.sort((a, b) => b.y - a.y);

    // Now detect whether this is True/False or MCQ by examining content near each row
    let tfCount = 0;
    let mcqCount = 0;
    let tfAnsXSum = 0;
    let tfAnsCount = 0;
    let mcqAnsXs: number[] = [];

    for (let i = 0; i < Math.min(qNumItems.length, 10); i++) {
      const cur = qNumItems[i];
      const next = i < qNumItems.length - 1 ? qNumItems[i + 1] : null;
      const prev = i > 0 ? qNumItems[i - 1] : null;

      const topY = prev ? (prev.y + cur.y) / 2 : (next ? cur.y + (cur.y - next.y) / 2 : cur.y + 25);
      const bottomY = next ? (cur.y + next.y) / 2 : (prev ? cur.y - (prev.y - cur.y) / 2 : cur.y - 25);

      const rowItems = items.filter(it => it.y <= topY && it.y > bottomY && it !== cur);

      // Check for true/false answers
      const tfItems = rowItems.filter(it =>
        /^(?:true|false|صح|خطأ)$/i.test(it.str.trim()) &&
        Math.abs(it.x - qNumX) > 50
      );
      if (tfItems.length > 0) {
        tfCount++;
        tfItems.forEach(it => { tfAnsXSum += it.x; tfAnsCount++; });
      }

      // Check for single letter answer keys (A/B/C/D)
      const letterItems = rowItems.filter(it =>
        /^[A-D]$/i.test(it.str.trim()) &&
        Math.abs(it.x - qNumX) > 10 &&
        Math.abs(it.x - qNumX) < viewportWidth * 0.6
      );
      if (letterItems.length > 0) {
        mcqCount++;
        letterItems.forEach(it => mcqAnsXs.push(it.x));
      }
    }

    if (tfCount >= mcqCount && tfCount >= 2) {
      // True/False format
      const avgTfAnsX = tfAnsCount > 0 ? tfAnsXSum / tfAnsCount : 0;
      // The TF answer threshold is the midpoint between the answer column and the question text
      const tfAnsThreshold = avgTfAnsX + (Math.abs(qNumX - avgTfAnsX) * 0.15);
      return {
        type: 'tf',
        qNumItems,
        qNumX,
        ansX: avgTfAnsX,
        tfAnsThreshold
      };
    }

    if (mcqCount >= 2) {
      // MCQ format - detect the answer key column X position
      const sortedAnsXs = mcqAnsXs.sort((a, b) => a - b);
      const medianAnsX = sortedAnsXs[Math.floor(sortedAnsXs.length / 2)];
      return {
        type: 'mcq',
        qNumItems,
        qNumX,
        ansX: medianAnsX
      };
    }

    // Fallback: if we have enough question numbers, try to detect layout from item positions
    // Check if items at the far side from qNum have true/false or choice patterns
    const isQNumOnRight = qNumX > viewportWidth * 0.5;
    const farSideItems = items.filter(it =>
      isQNumOnRight ? it.x < viewportWidth * 0.15 : it.x > viewportWidth * 0.85
    );
    const hasTF = farSideItems.some(it => /^(?:true|false)$/i.test(it.str.trim()));
    if (hasTF) {
      return {
        type: 'tf',
        qNumItems,
        qNumX,
        ansX: isQNumOnRight ? viewportWidth * 0.05 : viewportWidth * 0.95,
        tfAnsThreshold: isQNumOnRight ? viewportWidth * 0.12 : viewportWidth * 0.88
      };
    }

    return null;
  }

  private extractPageTable(items: any[], viewportWidth: number): string | null {
    const layout = this.detectPageLayout(items, viewportWidth);
    if (!layout) return null;

    const { qNumItems, qNumX } = layout;
    let markdown = '';

    // Pre-compute choice column boundaries for MCQ pages
    let choiceColBoundaries: number[] | null = null;
    if (layout.type === 'mcq') {
      choiceColBoundaries = this.detectChoiceColumns(items, qNumX, layout.ansX, viewportWidth);
    }

    for (let i = 0; i < qNumItems.length; i++) {
      const cur = qNumItems[i];
      const prev = i > 0 ? qNumItems[i - 1] : null;
      const next = i < qNumItems.length - 1 ? qNumItems[i + 1] : null;

      const topY = prev ? (prev.y + cur.y) / 2 : (next ? cur.y + (cur.y - next.y) / 2 : cur.y + 25);
      const bottomY = next ? (cur.y + next.y) / 2 : (prev ? cur.y - (prev.y - cur.y) / 2 : cur.y - 25);

      const rowItems = items.filter(it => it.y <= topY && it.y > bottomY && it !== cur);
      const qNum = parseInt(cur.str.trim(), 10);

      if (layout.type === 'tf') {
        markdown += this.extractTFRow(rowItems, qNum, qNumX, layout.ansX, layout.tfAnsThreshold!);
      } else {
        markdown += this.extractMCQRow(rowItems, qNum, qNumX, layout.ansX, viewportWidth, choiceColBoundaries || undefined);
      }
    }

    return markdown || null;
  }

  /**
   * Extract a True/False question row. The question number is on one side,
   * the true/false answer on the other side, and question text in between.
   */
  private extractTFRow(rowItems: any[], qNum: number, qNumX: number, ansX: number, tfAnsThreshold: number): string {
    const isQNumOnRight = qNumX > ansX;

    let ansItems: any[];
    let qItems: any[];

    if (isQNumOnRight) {
      // QNum on right, answers on left
      ansItems = rowItems.filter(it => it.x < tfAnsThreshold);
      qItems = rowItems.filter(it => it.x >= tfAnsThreshold);
    } else {
      // QNum on left, answers on right
      ansItems = rowItems.filter(it => it.x > tfAnsThreshold);
      qItems = rowItems.filter(it => it.x <= tfAnsThreshold);
    }

    const rawAns = ansItems.map(it => it.str.trim().toLowerCase()).join(' ');
    let ansKey = 'A'; // Default to صح (true)
    if (rawAns.includes('false') || rawAns.includes('خطأ') || rawAns.includes('خطا')) {
      ansKey = 'B';
    }

    const qText = this.assembleLineText(qItems);
    if (qText) {
      return `\n\n#### السؤال ${qNum} :\n${qText}\n- (A) صح\n- (B) خطأ\n**الإجابة:** ${ansKey}\n`;
    }
    return '';
  }

  /**
   * Extract an MCQ question row. Dynamically detects where the answer key letter,
   * question text, and choices A/B/C/D are positioned.
   * Uses pre-computed choice column boundaries when available.
   */
  private extractMCQRow(
    rowItems: any[], qNum: number, qNumX: number,
    ansMedianX: number, viewportWidth: number,
    choiceColBoundaries?: number[]
  ): string {
    // Separate answer key items (single letters A-D near the known answer-key X position)
    const ansItems = rowItems.filter(it =>
      /^[A-D]$/i.test(it.str.trim()) &&
      Math.abs(it.x - ansMedianX) < 30
    );
    const ansKey = ansItems.length > 0
      ? ansItems.map(it => it.str.trim().toUpperCase()).join('')
      : 'A';

    // Remove answer key items from consideration
    const remainingItems = rowItems.filter(it => !ansItems.includes(it));

    // Determine the direction: is qNum on the right or left?
    const isQNumOnRight = qNumX > viewportWidth * 0.5;

    if (isQNumOnRight) {
      // RTL layout: QNum on right, answer key in middle, choices spread to the left
      // Question text: items between qNumX and ansMedianX (x > ansMedianX area)
      // Choices: items with x < ansMedianX, in 4 columns

      const qTextThreshold = ansMedianX + 15;
      const qItems = remainingItems.filter(it => it.x > qTextThreshold);

      const choiceItems = remainingItems.filter(it => it.x <= qTextThreshold);

      let choiceA: string, choiceB: string, choiceC: string, choiceD: string;

      if (choiceColBoundaries && choiceColBoundaries.length >= 3) {
        // Use pre-computed boundaries [boundary1, boundary2, boundary3] splitting 4 columns
        // Boundaries are sorted descending for RTL: e.g. [260, 180, 110]
        const aItems = choiceItems.filter(it => it.x >= choiceColBoundaries[0]);
        const bItems = choiceItems.filter(it => it.x >= choiceColBoundaries[1] && it.x < choiceColBoundaries[0]);
        const cItems = choiceItems.filter(it => it.x >= choiceColBoundaries[2] && it.x < choiceColBoundaries[1]);
        const dItems = choiceItems.filter(it => it.x < choiceColBoundaries[2]);

        choiceA = this.assembleLineText(aItems);
        choiceB = this.assembleLineText(bItems);
        choiceC = this.assembleLineText(cItems);
        choiceD = this.assembleLineText(dItems);
      } else {
        // Fallback: equal-width columns
        const choiceAreaRight = qTextThreshold;
        const choiceWidth = choiceAreaRight / 4;
        choiceA = this.assembleLineText(choiceItems.filter(it => it.x >= choiceAreaRight - choiceWidth));
        choiceB = this.assembleLineText(choiceItems.filter(it => it.x >= choiceAreaRight - choiceWidth * 2 && it.x < choiceAreaRight - choiceWidth));
        choiceC = this.assembleLineText(choiceItems.filter(it => it.x >= choiceAreaRight - choiceWidth * 3 && it.x < choiceAreaRight - choiceWidth * 2));
        choiceD = this.assembleLineText(choiceItems.filter(it => it.x < choiceAreaRight - choiceWidth * 3));
      }

      const qText = this.assembleLineText(qItems);
      if (qText) {
        let md = `\n\n#### السؤال ${qNum} :\n${qText}\n`;
        if (choiceA) md += `- (A) ${choiceA}\n`;
        if (choiceB) md += `- (B) ${choiceB}\n`;
        if (choiceC) md += `- (C) ${choiceC}\n`;
        if (choiceD) md += `- (D) ${choiceD}\n`;
        md += `**الإجابة:** ${ansKey}\n`;
        return md;
      }
    } else {
      // LTR-style layout: QNum on left, choices spread to the right
      const qTextThreshold = ansMedianX - 15;
      const qItems = remainingItems.filter(it => it.x < qTextThreshold);
      const choiceItems = remainingItems.filter(it => it.x >= qTextThreshold);

      const choiceAreaRight = viewportWidth;
      const choiceWidth = (choiceAreaRight - qTextThreshold) / 4;

      const choiceA = this.assembleLineText(choiceItems.filter(it => it.x < qTextThreshold + choiceWidth));
      const choiceB = this.assembleLineText(choiceItems.filter(it => it.x >= qTextThreshold + choiceWidth && it.x < qTextThreshold + choiceWidth * 2));
      const choiceC = this.assembleLineText(choiceItems.filter(it => it.x >= qTextThreshold + choiceWidth * 2 && it.x < qTextThreshold + choiceWidth * 3));
      const choiceD = this.assembleLineText(choiceItems.filter(it => it.x >= qTextThreshold + choiceWidth * 3));

      const qText = this.assembleLineText(qItems);
      if (qText) {
        let md = `\n\n#### السؤال ${qNum} :\n${qText}\n`;
        if (choiceA) md += `- (A) ${choiceA}\n`;
        if (choiceB) md += `- (B) ${choiceB}\n`;
        if (choiceC) md += `- (C) ${choiceC}\n`;
        if (choiceD) md += `- (D) ${choiceD}\n`;
        md += `**الإجابة:** ${ansKey}\n`;
        return md;
      }
    }

    return '';
  }

  /**
   * Detect choice column boundaries by clustering all choice-area items across the page.
   * Returns 3 boundary X values (for RTL: sorted descending) that split 4 columns,
   * or null if boundaries cannot be determined.
   */
  private detectChoiceColumns(items: any[], qNumX: number, ansMedianX: number, viewportWidth: number): number[] | null {
    const isQNumOnRight = qNumX > viewportWidth * 0.5;

    // Collect all items in the choice area (excluding the answer key column)
    const choiceAreaItems = items.filter(it => {
      if (isQNumOnRight) {
        return it.x < ansMedianX - 15 && it.str && it.str.trim().length > 0;
      } else {
        return it.x > ansMedianX + 15 && it.str && it.str.trim().length > 0;
      }
    });

    if (choiceAreaItems.length < 8) return null;

    // Get the X positions of all choice items
    const xPositions = choiceAreaItems.map(it => it.x);

    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const range = maxX - minX;
    if (range < 50) return null;

    // Initialize 4 centers evenly spaced across the range
    let centers: number[] = [];
    for(let i=0; i<4; i++) {
      centers.push(minX + (i + 0.5) * (range) / 4);
    }

    // K-means clustering (k=4)
    for (let iter = 0; iter < 10; iter++) {
      const clusters: number[][] = [[], [], [], []];
      for (const x of xPositions) {
        let bestK = 0;
        let bestDist = Infinity;
        for (let k = 0; k < 4; k++) {
          const dist = Math.abs(x - centers[k]);
          if (dist < bestDist) {
            bestDist = dist;
            bestK = k;
          }
        }
        clusters[bestK].push(x);
      }
      
      for (let k = 0; k < 4; k++) {
        if (clusters[k].length > 0) {
          centers[k] = clusters[k].reduce((a, b) => a + b, 0) / clusters[k].length;
        }
      }
    }

    // Sort centers
    if (isQNumOnRight) {
      centers.sort((a, b) => b - a); // Descending for RTL
    } else {
      centers.sort((a, b) => a - b); // Ascending for LTR
    }

    // Calculate midpoints between centers as boundaries
    const boundaries: number[] = [];
    for (let i = 0; i < 3; i++) {
      boundaries.push((centers[i] + centers[i+1]) / 2);
    }

    return boundaries;
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

    // 2. Normalize bracketed answer annotations and alert notes
    fixed = fixed.replace(/-\s*\[\s*(?:الإجابة\s*الصحيحة|اإلجابة\s*الصحيحة|ة\s*حيحصلا\s*ة\s*باجلاإ|كنبلابةحيحصلاةباجإلا|الإجابة\s*الصحيحة\s*بالبنك)[^\]]*\]\s*/gi, '- [x] ');
    fixed = fixed.replace(/\[\s*(?:الإجابة\s*الصحيحة|اإلجابة\s*الصحيحة|ة\s*حيحصلا\s*ة\s*باجلاإ|كنبلابةحيحصلاةباجإلا|الإجابة\s*الصحيحة\s*بالبنك)[^\]]*\]/gi, ' [x] ');
    fixed = fixed.replace(/(?:^|\n|\s*)[\*\[\s]*\??\s*(?:تنبيه|هيبنت)\s*[:\s]*([^\n\r\]]+)[\]\s]*/gi, '\n> تنبيه: $1\n');

    // 3. Normalize question headers cleanly
    fixed = fixed.replace(/(?:^|\n)\s*(?:[:\s]+(\d+)\s*(?:الؤسلا|لؤسملا|لؤئسملا|لاؤسلا)|(?:الؤسلا|لؤسملا|لؤئسملا|لاؤسلا)\s*[:\s]*(\d+))[:\s\.]*/gi, '\n\n#### السؤال ' + '$1' + ' :\n');
    fixed = fixed.replace(/(?:^|\n)\s*(?:#+\s*)?(?:السؤال|سؤال|س|Q|Question)\s*(\d+)[:\s\.]*/gi, '\n\n#### السؤال $1 :\n');
    fixed = fixed.replace(/(?:^|\n)\s*(\d+)\s*[:\s]*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)/gi, '\n\n#### السؤال $1 :\n');

    // 4. Normalize True / False reversed pairs
    fixed = fixed.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n- ($1) صح\n- ($2) خطأ\n');
    fixed = fixed.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n- ($1) خطأ\n- ($2) صح\n');

    // 5. Normalize Answer Key markers
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*(?:[\(\[]\s*([أإابجدهوزحa-hA-H1-8])\s*[\)\]]|(حص[^\S\r\n]*[\(\[]?[^\S\r\n]*[أA][^\S\r\n]*[\)\]]?)|(أطخ[^\S\r\n]*[\(\[]?[^\S\r\n]*[بB][^\S\r\n]*[\)\]]?))[^\S\r\n]*(?:ة\s*حيحصلا|الصحيحة)?\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الحل)[:\s]*/gi, '\n**الإجابة:** $1$2$3\n');
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*[\u064B-\u065F\u0670]?(?:اإلجابة|الإجابة|الحل)\s*(?:الصحيحة)?(?:\s*بالبنك)?[:\s]*/gi, '\n**الإجابة:** ');
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*[\u064B-\u065F\u0670]?(?:ة\s*حيحصلا)?\s*(?:ة\s*باجلاإ|باجلاإ)[:\s]*/gi, '\n**الإجابة:** ');

    // 6. Reversed choice format: ) من 20-55 ممA( or 2-1) منA( or 37 ) 23مم / ممC( -> - (A) من 20-55 مم
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*(?!\*\*الإجابة:)(?!\*\*|الإجابة|اإلجابة|الحل|السؤال|سؤال)[\u064B-\u065F\u0670]?\)?\s*(.+?)\s*([A-Ha-hأإابجدهوزح])\s*\([^\S\r\n]*(?=\n|$)/g, (m, p1, p2) => {
      let cleanText = p1.replace(/^\s*[\)\(]\s*/, '').replace(/[\)\(]\s*$/, '').trim();
      return '\n- (' + p2 + ') ' + cleanText;
    });
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*(?!\*\*الإجابة:)(?!\*\*|الإجابة|اإلجابة|الحل|السؤال|سؤال)\)\s*([^\(\)\n\r]+?)\s*([A-Ha-hأإابجدهوزح])(?=[^\S\r\n]*(?:\n|$))/g, '\n- ($2) $1');

    // 7. Convert trailing labels like `من 2-3 )A(` to `- (A) من 2-3`
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*(?!\*\*الإجابة:)(?!\*\*|الإجابة|اإلجابة|الحل|السؤال|سؤال)([^\n\r\(\)]+?)\s*[\(\)]\s*([A-Ha-hأإابجدهوزح])\s*[\(\)](?=\n|$)/g, '\n- ($2) $1');

    // 8. Convert leading labels like `(A) من 2-3` to `- (A) من 2-3`
    fixed = fixed.replace(/(?:^|\n)[^\S\r\n]*(?!\*\*الإجابة:)(?!\*\*|الإجابة|اإلجابة|الحل|السؤال|سؤال)[\(\[]?\s*([A-Ha-hأإابجدهوزح])\s*[\)\]][\(\)]?\s*(.+)$/gm, '\n- ($1) $2');

    return fixed;
  }
}
