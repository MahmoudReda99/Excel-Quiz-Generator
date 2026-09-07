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
      let pageText = '';
      
      for (const item of textContent.items as any[]) {
        if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
          // Significant change in Y coordinate indicates a new line
          pageText += '\n';
        } else if (lastY !== -1) {
          // Same line, add a space
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  }
}
