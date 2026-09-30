import { ExcelData } from './excel.model';
import { QuizQuestion, QuizState } from './quiz.model';

export type SupportedFileType = 'pdf' | 'excel' | 'markdown' | 'text';

export interface SavedFileRecord {
  id: string;
  name: string;
  fileType: SupportedFileType;
  fileSize: number;
  uploadedAt: string; // ISO 8601
  blob?: Blob;
  excelData: ExcelData;
  questionCount: number;
  questions?: QuizQuestion[];
  notes?: string;
  tags?: string[];
}

export interface SavedFileSummary {
  id: string;
  name: string;
  fileType: SupportedFileType;
  fileSize: number;
  uploadedAt: string;
  questionCount: number;
  sheetCount: number;
}

export interface SavedQuizSession {
  id: string;
  fileId?: string;
  fileName: string;
  updatedAt: string;
  quizState: QuizState;
  excelData?: ExcelData;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
}
