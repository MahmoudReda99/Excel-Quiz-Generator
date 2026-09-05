import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ExcelParserService } from '../../services/excel-parser.service';
import { MarkdownParserService } from '../../services/markdown-parser.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ExcelData } from '../../models/excel.model';

interface SelectedFileItem {
  file: File;
  buffer: ArrayBuffer | null;
  text: string | null;
  isMd: boolean;
  readPromise: Promise<ArrayBuffer | string>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FileUploadComponent, TranslatePipe],
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
              <div class="flex items-center gap-2.5 truncate me-2">
                <span class="text-lg">{{ selected.isMd ? '📝' : '📊' }}</span>
                <span class="truncate">{{ selected.file.name }}</span>
                <span class="text-xs text-gray-400 font-normal">({{ formatSize(selected.file.size) }})</span>
                <span *ngIf="selected.isMd" class="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                  Markdown
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
    </div>
  `
})
export class HomeComponent {
  private excelParser = inject(ExcelParserService);
  private mdParser = inject(MarkdownParserService);
  private quizState = inject(QuizStateService);
  private router = inject(Router);

  selectedFiles: SelectedFileItem[] = [];
  isLoading = false;
  errorMessage = '';
  progressMessage = '';

  onFilesSelected(files: File[]) {
    const existingNames = new Set(this.selectedFiles.map(selected => selected.file.name));
    files.forEach(f => {
      if (!existingNames.has(f.name)) {
        const isMd = f.name.toLowerCase().endsWith('.md') || f.name.toLowerCase().endsWith('.markdown');
        this.progressMessage = `جاري تجهيز ${f.name}...`;

        const selected: SelectedFileItem = {
          file: f,
          buffer: null,
          text: null,
          isMd,
          readPromise: isMd ? this.mdParser.readMarkdownFile(f) : this.excelParser.readFileBuffer(f)
        };

        selected.readPromise
          .then(res => {
            if (isMd) {
              selected.text = res as string;
            } else {
              selected.buffer = res as ArrayBuffer;
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
    
    this.isLoading = true;
    this.errorMessage = '';
    this.progressMessage = 'تم الضغط على زر التحليل...';

    try {
      this.progressMessage = 'جاري التأكد من جاهزية الملفات...';
      const preparedFiles = await Promise.all(
        this.selectedFiles.map(async selected => {
          if (selected.isMd) {
            const text = selected.text || await (selected.readPromise as Promise<string>);
            return { file: selected.file, isMd: true, text, buffer: null };
          } else {
            const buffer = selected.buffer || await (selected.readPromise as Promise<ArrayBuffer>);
            return { file: selected.file, isMd: false, buffer, text: null };
          }
        })
      );
      this.progressMessage = 'جاري استخراج الأسئلة والإجابات...';
      const mergedData = this.buildExcelData(preparedFiles);
      this.progressMessage = `تم استخراج ${mergedData.sheets.length} ورقة. جاري فتح صفحة التحليل...`;
      this.quizState.setExcelData(mergedData);
      const navigated = await this.router.navigate(['/analysis']);
      if (!navigated) {
        throw new Error('تم تحليل الملف، لكن لم يتم فتح صفحة التحليل.');
      }
    } catch (error) {
      console.error('Error parsing files:', error);
      this.progressMessage = '';
      this.errorMessage = error instanceof Error && error.message
        ? error.message
        : 'فشل في تحليل بعض الملفات. يرجى التأكد من أن الملفات بصيغة .xlsx أو .xls أو .md جديدة.';
    } finally {
      this.isLoading = false;
    }
  }

  private buildExcelData(preparedFiles: Array<{ file: File; isMd: boolean; buffer: ArrayBuffer | null; text: string | null }>): ExcelData {
    const parsedList: ExcelData[] = preparedFiles.map(p => {
      if (p.isMd && p.text !== null) {
        return this.mdParser.convertMarkdownToExcelData(p.file.name, p.file.size, p.text);
      } else if (p.buffer) {
        return this.excelParser.readWorkbookBuffer(p.file.name, p.file.size, p.buffer);
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
