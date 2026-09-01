export interface UploadedFileInfo {
  fileName: string;
  fileSize: number;
  sheetCount: number;
}

export interface ExcelData {
  fileName: string;
  fileSize: number;
  sheets: SheetInfo[];
  selectedSheet: number;
  files?: UploadedFileInfo[];
  isMultiFile?: boolean;
}

export interface SheetInfo {
  name: string;
  index: number;
  headers: string[];
  rows: any[][];
  rowCount: number;
  colCount: number;
  fileName?: string;
}

export interface ColumnMapping {
  questionCol: number | null;
  choiceCols: number[];
  correctAnswerCol: number | null;
  typeCol: number | null;
  explanationCol: number | null;
  difficultyCol: number | null;
}

export interface DetectionResult {
  mapping: ColumnMapping;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface ValidationIssue {
  questionIndex: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  validCount: number;
  issues: ValidationIssue[];
  isValid: boolean;
}
