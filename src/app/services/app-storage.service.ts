import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SavedFileRecord, SavedFileSummary, SavedQuizSession, StorageUsage, SupportedFileType } from '../models/storage.model';
import { ExcelData } from '../models/excel.model';
import { QuizQuestion } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class AppStorageService {
  private readonly DB_NAME = 'QuizAppDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_FILES = 'saved_files';
  private readonly STORE_SESSIONS = 'quiz_sessions';

  private dbPromise: Promise<IDBDatabase> | null = null;
  public savedFiles$ = new BehaviorSubject<SavedFileSummary[]>([]);
  public activeSession$ = new BehaviorSubject<SavedQuizSession | null>(null);

  constructor() {
    if (typeof window !== 'undefined' && window.indexedDB) {
      this.refreshSavedFilesList();
      this.loadActiveSession();
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create saved_files store
        if (!db.objectStoreNames.contains(this.STORE_FILES)) {
          const fileStore = db.createObjectStore(this.STORE_FILES, { keyPath: 'id' });
          fileStore.createIndex('name', 'name', { unique: false });
          fileStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          fileStore.createIndex('fileType', 'fileType', { unique: false });
        }

        // Create quiz_sessions store
        if (!db.objectStoreNames.contains(this.STORE_SESSIONS)) {
          const sessionStore = db.createObjectStore(this.STORE_SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save or update a parsed file record along with its binary Blob and questions cache
   */
  async saveFileRecord(
    file: File | null,
    excelData: ExcelData,
    questions?: QuizQuestion[],
    existingId?: string
  ): Promise<string> {
    const db = await this.getDB();
    const name = excelData.fileName || file?.name || 'مجموعة أسئلة بدون اسم';
    
    let fileType: SupportedFileType = 'excel';
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) fileType = 'pdf';
    else if (lower.endsWith('.md') || lower.endsWith('.markdown')) fileType = 'markdown';
    else if (lower.endsWith('.txt')) fileType = 'text';

    let totalQuestions = 0;
    if (questions && questions.length > 0) {
      totalQuestions = questions.length;
    } else {
      excelData.sheets.forEach(s => {
        if (!s.isLookup && s.rowCount > 0) totalQuestions += s.rowCount;
      });
    }

    const id = existingId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: SavedFileRecord = {
      id,
      name,
      fileType,
      fileSize: file?.size || excelData.fileSize || 0,
      uploadedAt: new Date().toISOString(),
      blob: file ? file.slice() : undefined,
      excelData,
      questionCount: totalQuestions,
      questions
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_FILES, 'readwrite');
      const store = tx.objectStore(this.STORE_FILES);
      const req = store.put(record);

      req.onsuccess = () => {
        this.refreshSavedFilesList();
        resolve(id);
      };

      req.onerror = () => {
        console.error('Error saving file record to IndexedDB:', req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Refresh and emit the list of saved file summaries
   */
  async refreshSavedFilesList(): Promise<SavedFileSummary[]> {
    try {
      const db = await this.getDB();
      const list: SavedFileSummary[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_FILES, 'readonly');
        const store = tx.objectStore(this.STORE_FILES);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: SavedFileRecord[] = req.result || [];
          const summaries: SavedFileSummary[] = records.map(r => ({
            id: r.id,
            name: r.name,
            fileType: r.fileType,
            fileSize: r.fileSize,
            uploadedAt: r.uploadedAt,
            questionCount: r.questionCount,
            sheetCount: r.excelData?.sheets?.length || 0
          }));
          // Sort latest first
          summaries.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          resolve(summaries);
        };

        req.onerror = () => reject(req.error);
      });

      this.savedFiles$.next(list);
      return list;
    } catch (err) {
      console.warn('Could not refresh saved files list:', err);
      return [];
    }
  }

  /**
   * Retrieve a full record by its ID
   */
  async getSavedFileById(id: string): Promise<SavedFileRecord | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_FILES, 'readonly');
      const store = tx.objectStore(this.STORE_FILES);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a saved file record
   */
  async deleteSavedFile(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_FILES, 'readwrite');
      const store = tx.objectStore(this.STORE_FILES);
      const req = store.delete(id);

      req.onsuccess = () => {
        this.refreshSavedFilesList();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clear all saved files
   */
  async clearAllSavedFiles(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_FILES, 'readwrite');
      const store = tx.objectStore(this.STORE_FILES);
      const req = store.clear();

      req.onsuccess = () => {
        this.refreshSavedFilesList();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save active quiz session for auto-resume
   */
  async saveActiveSession(session: SavedQuizSession): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_SESSIONS, 'readwrite');
        const store = tx.objectStore(this.STORE_SESSIONS);
        const req = store.put({ ...session, id: 'current_active_session' });

        req.onsuccess = () => {
          this.activeSession$.next(session);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not save active session:', err);
    }
  }

  /**
   * Load active session from storage
   */
  async loadActiveSession(): Promise<SavedQuizSession | null> {
    try {
      const db = await this.getDB();
      const session: SavedQuizSession | null = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_SESSIONS, 'readonly');
        const store = tx.objectStore(this.STORE_SESSIONS);
        const req = store.get('current_active_session');

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      this.activeSession$.next(session);
      return session;
    } catch (err) {
      console.warn('Could not load active session:', err);
      return null;
    }
  }

  /**
   * Clear active session when completed or dismissed
   */
  async clearActiveSession(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_SESSIONS, 'readwrite');
        const store = tx.objectStore(this.STORE_SESSIONS);
        const req = store.delete('current_active_session');

        req.onsuccess = () => {
          this.activeSession$.next(null);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not clear active session:', err);
    }
  }

  /**
   * Estimate browser storage usage
   */
  async getStorageUsage(): Promise<StorageUsage> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || (1024 * 1024 * 1024); // Fallback to 1GB
        const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
        return {
          usedBytes: used,
          quotaBytes: quota,
          percentUsed: percent
        };
      } catch (e) {
        console.warn('Storage estimate not supported or failed:', e);
      }
    }
    return { usedBytes: 0, quotaBytes: 0, percentUsed: 0 };
  }

  /**
   * Helper to trigger downloading the original file Blob
   */
  downloadFileBlob(record: SavedFileRecord): void {
    if (!record.blob && !record.excelData) {
      console.warn('No file content available to download.');
      return;
    }

    let blob = record.blob;
    if (!blob) {
      // Fallback: construct text or JSON blob
      const jsonStr = JSON.stringify(record.excelData, null, 2);
      blob = new Blob([jsonStr], { type: 'application/json' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
