import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ExcelData, SheetInfo, UploadedFileInfo } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelParserService {
  private headerKeywords = [
    'serial', 'تسلسلي', 'qeustion', 'question', 'سؤال', 'جذعية',
    'correct', 'answer', 'إجابة', 'اجابة', 'option', 'خيار', 'score', 'difficulty'
  ];

  readFile(file: File): Promise<ExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheets: SheetInfo[] = workbook.SheetNames.map((sheetName, index) => {
            const sheetData = this.getSheetData(workbook, index);
            sheetData.fileName = file.name;
            return sheetData;
          });
          
          resolve({
            fileName: file.name,
            fileSize: file.size,
            sheets,
            selectedSheet: 0,
            files: [{ fileName: file.name, fileSize: file.size, sheetCount: sheets.filter(s => s.rowCount > 0).length }],
            isMultiFile: false
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
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
