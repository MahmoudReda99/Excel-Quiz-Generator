import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ExcelData, SheetInfo } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelParserService {
  readFile(file: File): Promise<ExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheets: SheetInfo[] = workbook.SheetNames.map((sheetName, index) => {
            return this.getSheetData(workbook, index);
          });
          
          resolve({
            fileName: file.name,
            fileSize: file.size,
            sheets,
            selectedSheet: 0
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

  getSheetData(workbook: XLSX.WorkBook, sheetIndex: number): SheetInfo {
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
    
    // Find header row by skipping completely empty rows at the beginning
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i] && rawData[i].some(cell => cell !== null && cell !== undefined && cell !== '')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      return { name: sheetName, index: sheetIndex, headers: [], rows: [], rowCount: 0, colCount: 0 };
    }
    
    const headers = rawData[headerRowIndex].map(h => h ? String(h).trim() : '');
    
    const rows = rawData.slice(headerRowIndex + 1).filter(row => {
      return row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '');
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
