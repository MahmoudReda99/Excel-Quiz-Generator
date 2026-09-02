import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ExcelData, SheetInfo, UploadedFileInfo } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelParserService {
  private readonly readTimeoutMs = 15000;

  private headerKeywords = [
    'serial', 'تسلسلي', 'qeustion', 'question', 'سؤال', 'جذعية',
    'correct', 'answer', 'إجابة', 'اجابة', 'option', 'خيار', 'score', 'difficulty'
  ];

  async readFile(file: File): Promise<ExcelData> {
    const buffer = await this.readFileBuffer(file);
    return this.readWorkbookBuffer(file.name, file.size, buffer);
  }

  readWorkbookBuffer(fileName: string, fileSize: number, buffer: ArrayBuffer): ExcelData {
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheets: SheetInfo[] = workbook.SheetNames.map((sheetName, index) => {
      const sheetData = this.getSheetData(workbook, index);
      sheetData.fileName = fileName;
      return sheetData;
    });

    return {
      fileName,
      fileSize,
      sheets,
      selectedSheet: 0,
      files: [{ fileName, fileSize, sheetCount: sheets.filter(s => s.rowCount > 0).length }],
      isMultiFile: false
    };
  }

  readFileBuffer(file: File): Promise<ArrayBuffer> {
    const readPromise = typeof file.arrayBuffer === 'function'
      ? file.arrayBuffer()
      : this.readFileBufferWithFileReader(file);

    return this.withTimeout(
      readPromise,
      `تعذر قراءة الملف "${file.name}". إذا كان الملف محفوظا على iCloud أو Google Drive، افتحه/نزله على الجهاز أولا ثم اختره مرة أخرى.`
    );
  }

  private readFileBufferWithFileReader(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  private withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error(message));
      }, this.readTimeoutMs);

      promise
        .then((result) => {
          window.clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  async readMultipleFiles(files: File[]): Promise<ExcelData> {
    if (files.length === 1) {
      return this.readFile(files[0]);
    }

    const parsedList = await Promise.all(files.map(f => this.readFile(f)));
    
    let allSheets: SheetInfo[] = [];
    const filesInfo: UploadedFileInfo[] = [];
    let totalSize = 0;

    parsedList.forEach((parsed) => {
      totalSize += parsed.fileSize;
      const validSheets = parsed.sheets.filter(s => s.rowCount > 0);
      filesInfo.push({
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        sheetCount: validSheets.length
      });

      validSheets.forEach((sheet) => {
        allSheets.push({
          ...sheet,
          name: `${parsed.fileName} -> ${sheet.name}`,
          index: allSheets.length,
          fileName: parsed.fileName
        });
      });
    });

    const displayTitle = `دمج ${files.length} ملفات إكسل مخصصة`;

    return {
      fileName: displayTitle,
      fileSize: totalSize,
      sheets: allSheets,
      selectedSheet: -1,
      files: filesInfo,
      isMultiFile: true
    };
  }

  getSheetData(workbook: XLSX.WorkBook, sheetIndex: number): SheetInfo {
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
    if (!rawData || rawData.length === 0) {
      return { name: sheetName, index: sheetIndex, headers: [], rows: [], rowCount: 0, colCount: 0 };
    }
    
    // Find the real table header row by scoring rows 0 to 10 for table header keywords
    let headerRowIndex = -1;
    let maxHeaderScore = 0;

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      if (!rawData[i] || !Array.isArray(rawData[i])) continue;
      let score = 0;
      rawData[i].forEach(cell => {
        if (!cell) return;
        const str = String(cell).toLowerCase().replace(/[*_\s]+/g, ' ').trim();
        if (this.headerKeywords.some(kw => str.includes(kw))) {
          score += 2;
        }
      });

      if (score > maxHeaderScore) {
        maxHeaderScore = score;
        headerRowIndex = i;
      }
    }
    
    // Fallback: if no keyword score match, take first non-empty row
    if (headerRowIndex === -1) {
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i] && rawData[i].some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return { name: sheetName, index: sheetIndex, headers: [], rows: [], rowCount: 0, colCount: 0 };
    }
    
    const headers = rawData[headerRowIndex].map(h => h !== null && h !== undefined ? String(h).trim() : '');
    
    const rows = rawData.slice(headerRowIndex + 1).filter(row => {
      return row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    });
    
    return {
      name: sheetName,
      index: sheetIndex,
      headers,
      rows,
      rowCount: rows.length,
      colCount: headers.length
    };
  }
}
