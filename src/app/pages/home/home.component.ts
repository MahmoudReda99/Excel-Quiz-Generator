import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ExcelParserService } from '../../services/excel-parser.service';
import { MarkdownParserService } from '../../services/markdown-parser.service';
import { PdfParserService } from '../../services/pdf-parser.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ExcelData } from '../../models/excel.model';

interface SelectedFileItem {
  file: File;
  buffer: ArrayBuffer | null;
  text: string | null;
  isMd: boolean;
  isPdf: boolean;
  isEncrypted?: boolean;
  password?: string;
  readPromise: Promise<ArrayBuffer | string>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent, TranslatePipe],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8 flex flex-col items-center">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-black text-gray-900 tracking-tight sm:text-5xl">
          {{ 'app.title' | translate }}
        </h1>
        <p class="mt-3 text-base sm:text-lg text-gray-600 font-medium">
          {{ 'app.subtitle' | translate }}
        </p>
      </div>

      <div class="w-full space-y-6">
        <!-- Drag & Drop Upload Area -->
        <app-file-upload (filesSelected)="onFilesSelected($event)"></app-file-upload>
        
        <!-- List of Selected / Queued Files -->
        <div *ngIf="selectedFiles.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 class="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <span>📚</span>
              <span>الملفات المختارة للدمج ({{ selectedFiles.length }})</span>
            </h3>
            <button (click)="clearFiles()" class="text-xs text-rose-600 hover:text-rose-700 font-bold">
              إزالة الكل
            </button>
          </div>

          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div 
              *ngFor="let selected of selectedFiles; let i = index" 
              class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">
              <div class="flex items-center gap-2.5 truncate me-2 flex-wrap">
                <span class="text-lg">{{ selected.isPdf ? '📕' : (selected.isMd ? '📝' : '📊') }}</span>
                <span class="truncate max-w-[200px] sm:max-w-xs">{{ selected.file.name }}</span>
                <span class="text-xs text-gray-400 font-normal">({{ formatSize(selected.file.size) }})</span>
                <span *ngIf="selected.isMd" class="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                  Markdown
                </span>
                <span *ngIf="selected.isPdf" class="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                  PDF
                </span>
                <span 
                  *ngIf="selected.isEncrypted" 
                  (click)="openPasswordModalFor(selected)"
                  class="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-200 transition-colors"
                  title="انقر لتعديل كلمة المرور">
                  <span>🔒</span>
                  <span>{{ selected.password ? 'تم فك القفل' : 'محمي بكلمة سر' }}</span>
                </span>
                <span *ngIf="!selected.buffer && !selected.text" class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  تجهيز
                </span>
              </div>
              <button 
                (click)="removeFile(i)" 
                class="w-7 h-7 rounded-lg bg-gray-200 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center font-bold text-xs transition-all flex-shrink-0">
                ✕
              </button>
            </div>
          </div>

          <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button 
              type="button" 
              class="btn-primary text-base font-bold px-10 py-4 w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
              [disabled]="isLoading"
              (click)="analyzeFiles()"
              (touchend)="analyzeFiles($event)"
            >
              <span>{{ isLoading ? '⏳' : '🚀' }}</span>
              <span>{{ isLoading ? 'جاري التحليل...' : (selectedFiles.length > 1 ? 'دمج وتحليل الملفات المختارة' : ('upload.analyze' | translate)) }}</span>
            </button>
            <p *ngIf="progressMessage" class="text-xs font-bold text-gray-500 text-center">
              {{ progressMessage }}
            </p>
          </div>
        </div>

        <div *ngIf="isLoading" class="text-center py-6">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
          <p class="mt-2 text-sm font-bold text-gray-600">جاري قراءة ودمج الأسئلة...</p>
        </div>

        <div *ngIf="errorMessage" class="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl font-semibold text-sm">
          {{ errorMessage }}
        </div>
      </div>

      <!-- Password Prompt Modal -->
      <div 
        *ngIf="isPasswordModalOpen" 
        class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        (click)="closePasswordModal()">
        <div 
          class="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-5 animate-scaleUp text-start"
          (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3">
            <span class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl flex-shrink-0">
              🔒
            </span>
            <div>
              <h3 class="text-lg font-black text-gray-900 leading-tight">
                {{ 'passwordModal.title' | translate }}
              </h3>
              <p class="text-xs font-bold text-gray-500 truncate max-w-[240px] mt-0.5">
                {{ passwordTargetFile?.file?.name }}
              </p>
            </div>
          </div>

          <p class="text-xs text-gray-600 leading-relaxed font-medium">
            {{ 'passwordModal.desc' | translate }}
          </p>

          <!-- Password Input with Toggle Visibility -->
          <div class="space-y-1.5">
            <div class="relative flex items-center">
              <input
                #passwordInputField
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="passwordInput"
                (keydown.enter)="submitPassword()"
                (keydown.escape)="closePasswordModal()"
                [placeholder]="'passwordModal.placeholder' | translate"
                class="w-full ps-4 pe-11 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border-2 border-gray-200 focus:border-primary-500 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
              />
              <button
                type="button"
                (click)="showPassword = !showPassword"
                class="absolute end-3 text-gray-400 hover:text-gray-700 p-1 text-sm select-none"
                tabindex="-1"
                [title]="showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>

            <div *ngIf="passwordError" class="text-xs font-bold text-rose-600 flex items-center gap-1.5 pt-1">
              <span>⚠️</span>
              <span>{{ passwordError }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              (click)="closePasswordModal()"
              class="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all">
              {{ 'passwordModal.cancel' | translate }}
            </button>

            <button
              type="button"
              (click)="submitPassword()"
              [disabled]="!passwordInput || isUnlocking"
              class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5">
              <span>{{ isUnlocking ? '⏳' : '🔓' }}</span>
              <span>{{ (isUnlocking ? 'passwordModal.unlocking' : 'passwordModal.unlock') | translate }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent {
  private excelParser = inject(ExcelParserService);
  private mdParser = inject(MarkdownParserService);
  private pdfParser = inject(PdfParserService);
  private quizState = inject(QuizStateService);
  private router = inject(Router);

  selectedFiles: SelectedFileItem[] = [];
  isLoading = false;
  errorMessage = '';
  progressMessage = '';

  // Password Modal State
  isPasswordModalOpen = false;
  passwordTargetFile: SelectedFileItem | null = null;
  passwordInput = '';
  passwordError = '';
  showPassword = false;
  isUnlocking = false;

  onFilesSelected(files: File[]) {
    const existingNames = new Set(this.selectedFiles.map(selected => selected.file.name));
    files.forEach(f => {
      if (!existingNames.has(f.name)) {
        const isMd = f.name.toLowerCase().endsWith('.md') || f.name.toLowerCase().endsWith('.markdown') || f.name.toLowerCase().endsWith('.txt');
        const isPdf = f.name.toLowerCase().endsWith('.pdf');
        this.progressMessage = `جاري تجهيز ${f.name}...`;

        let readPromise: Promise<ArrayBuffer | string>;
        if (isMd) {
          readPromise = this.mdParser.readMarkdownFile(f);
        } else if (isPdf) {
          readPromise = this.pdfParser.extractText(f);
        } else {
          readPromise = this.excelParser.readFileBuffer(f);
        }

        const selected: SelectedFileItem = {
          file: f,
          buffer: null,
          text: null,
          isMd,
          isPdf,
          readPromise
        };

        selected.readPromise
          .then(res => {
            if (isMd || isPdf) {
              selected.text = res as string;
            } else {
              const buf = res as ArrayBuffer;
              selected.buffer = buf;
              if (this.excelParser.isEncrypted(buf)) {
                selected.isEncrypted = true;
                // Auto-open password modal if single file uploaded
                if (this.selectedFiles.length === 1 || files.length === 1) {
                  this.openPasswordModalFor(selected);
                }
              }
            }
            this.progressMessage = `تم تجهيز ${f.name}. اضغط تحليل الملف.`;
          })
          .catch(error => {
            console.error('Error preparing file:', error);
            this.progressMessage = '';
            this.errorMessage = error instanceof Error && error.message
              ? error.message
              : 'تعذر تجهيز الملف على هذا الجهاز.';
          });

        this.selectedFiles.push(selected);
      }
    });
    this.errorMessage = '';
  }

  openPasswordModalFor(item: SelectedFileItem) {
    this.passwordTargetFile = item;
    this.passwordInput = item.password || '';
    this.passwordError = '';
    this.showPassword = false;
    this.isPasswordModalOpen = true;
  }

  closePasswordModal() {
    this.isPasswordModalOpen = false;
    this.passwordInput = '';
    this.passwordError = '';
  }

  submitPassword() {
    if (!this.passwordTargetFile || !this.passwordTargetFile.buffer || !this.passwordInput) return;

    this.isUnlocking = true;
    this.passwordError = '';

    try {
      // Test reading with entered password
      this.excelParser.readWorkbookBuffer(
        this.passwordTargetFile.file.name,
        this.passwordTargetFile.file.size,
        this.passwordTargetFile.buffer,
        this.passwordInput
      );

      // Successfully unlocked
      this.passwordTargetFile.password = this.passwordInput;
      this.passwordTargetFile.isEncrypted = true;
      this.closePasswordModal();
    } catch (err: any) {
      console.error('Password unlock error:', err);
      this.passwordError = 'كلمة المرور غير صحيحة، يرجى التحقق والمحاولة مرة أخرى.';
    } finally {
      this.isUnlocking = false;
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  clearFiles() {
    this.selectedFiles = [];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async analyzeFiles(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.selectedFiles.length === 0 || this.isLoading) return;
    
    // Check if any file needs password first
    const lockedFileWithoutPassword = this.selectedFiles.find(
      s => s.buffer && this.excelParser.isEncrypted(s.buffer) && !s.password
    );
    if (lockedFileWithoutPassword) {
      this.openPasswordModalFor(lockedFileWithoutPassword);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.progressMessage = 'تم الضغط على زر التحليل...';

    try {
      this.progressMessage = 'جاري التأكد من جاهزية الملفات...';
      const preparedFiles = await Promise.all(
        this.selectedFiles.map(async selected => {
          if (selected.isMd || selected.isPdf) {
            const text = selected.text || await (selected.readPromise as Promise<string>);
            return { file: selected.file, isMd: selected.isMd, isPdf: selected.isPdf, text, buffer: null, password: selected.password };
          } else {
            const buffer = selected.buffer || await (selected.readPromise as Promise<ArrayBuffer>);
            return { file: selected.file, isMd: false, isPdf: false, buffer, text: null, password: selected.password };
          }
        })
      );
      this.progressMessage = 'جاري استخراج الأسئلة والإجابات...';
      const mergedData = this.buildExcelData(preparedFiles);
      
      const validSheets = mergedData.sheets.filter(s => s.rowCount > 0);
      if (validSheets.length === 0) {
        throw new Error('لم يتم العثور على أسئلة أو نصوص قابلة للقراءة في الملف. إذا كان ملف PDF، تأكد أنه يحتوي على نصوص وليس مجرد صور مقصوصة. وإذا كان ملف إكسل، تأكد من وجود بيانات فيه.');
      }

      this.progressMessage = `تم استخراج ${validSheets.length} ورقة. جاري فتح صفحة التحليل...`;
      this.quizState.setExcelData(mergedData);
      const navigated = await this.router.navigate(['/analysis']);
      if (!navigated) {
        throw new Error('تم تحليل الملف، لكن لم يتم فتح صفحة التحليل.');
      }
    } catch (error: any) {
      console.error('Error parsing files:', error);
      this.progressMessage = '';
      if (error?.isPasswordRequired || error?.message === 'PASSWORD_REQUIRED') {
        const locked = this.selectedFiles.find(s => s.buffer && this.excelParser.isEncrypted(s.buffer));
        if (locked) {
          this.openPasswordModalFor(locked);
          return;
        }
      }
      this.errorMessage = error instanceof Error && error.message
        ? error.message
        : 'فشل في تحليل بعض الملفات. يرجى التأكد من أن الملفات بصيغة .xlsx أو .pdf أو .md جديدة.';
    } finally {
      this.isLoading = false;
    }
  }

  private buildExcelData(preparedFiles: Array<{ file: File; isMd: boolean; isPdf: boolean; buffer: ArrayBuffer | null; text: string | null; password?: string }>): ExcelData {
    const parsedList: ExcelData[] = preparedFiles.map(p => {
      if ((p.isMd || p.isPdf) && p.text !== null) {
        return this.mdParser.convertMarkdownToExcelData(p.file.name, p.file.size, p.text);
      } else if (p.buffer) {
        return this.excelParser.readWorkbookBuffer(p.file.name, p.file.size, p.buffer, p.password);
      }
      throw new Error(`تعذر قراءة محتوى الملف ${p.file.name}`);
    });

    if (parsedList.length === 1) {
      return parsedList[0];
    }

    let allSheets: ExcelData['sheets'] = [];
    const filesInfo: NonNullable<ExcelData['files']> = [];
    let totalSize = 0;

    parsedList.forEach(parsed => {
      totalSize += parsed.fileSize;
      const validSheets = parsed.sheets.filter(sheet => sheet.rowCount > 0);
      filesInfo.push({
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        sheetCount: validSheets.length
      });

      validSheets.forEach(sheet => {
        allSheets.push({
          ...sheet,
          name: `${parsed.fileName} -> ${sheet.name}`,
          index: allSheets.length,
          fileName: parsed.fileName
        });
      });
    });

    return {
      fileName: `دمج ${preparedFiles.length} ملفات أسئلة مخصصة`,
      fileSize: totalSize,
      sheets: allSheets,
      selectedSheet: -1,
      files: filesInfo,
      isMultiFile: true
    };
  }
}
