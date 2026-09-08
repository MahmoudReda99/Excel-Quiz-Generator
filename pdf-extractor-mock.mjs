import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

export async function extractText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let lastY = -1, lastX = -1, lastW = 0, pageText = '';
    for (const item of textContent.items) {
      if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
        pageText += '\n'; lastX = -1;
      } else if (lastX !== -1) {
        let gap = item.transform[4] < lastX ? lastX - (item.transform[4] + item.width) : item.transform[4] - (lastX + lastW);
        if (gap > 2) pageText += ' ';
      }
      pageText += item.str;
      lastY = item.transform[5]; lastX = item.transform[4]; lastW = item.width;
    }
    fullText += pageText + '\n\n';
  }
  
  // Fix ligatures
  let fixed = fullText.split('').map(char => {
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
  return fixed;
}
