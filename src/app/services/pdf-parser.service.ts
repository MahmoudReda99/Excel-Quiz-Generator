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
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
    
    return fullText;
  }
}
