import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { ExcelParserService } from '../../services/excel-parser.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ExcelData } from '../../models/excel.model';

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
              *ngFor="let file of selectedFiles; let i = index" 
              class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">
              <div class="flex items-center gap-2.5 truncate me-2">
                <span class="text-lg">📊</span>
                <span class="truncate">{{ file.name }}</span>
                <span class="text-xs text-gray-400 font-normal">({{ formatSize(file.size) }})</span>
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
            >
              <span>🚀</span>
              <span>{{ selectedFiles.length > 1 ? 'دمج وتحليل الملفات المختارة' : ('upload.analyze' | translate) }}</span>
            </button>
          </div>
        </div>

        <div *ngIf="isLoading" class="text-center py-6">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
          <p class="mt-2 text-sm font-bold text-gray-600">جاري قراءة ودمج ملفات الإكسل...</p>
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
  private quizState = inject(QuizStateService);
  private router = inject(Router);

  selectedFiles: File[] = [];
  isLoading = false;
  errorMessage = '';

  onFilesSelected(files: File[]) {
    // Append new files avoiding duplicates by name
    const existingNames = new Set(this.selectedFiles.map(f => f.name));
    files.forEach(f => {
      if (!existingNames.has(f.name)) {
        this.selectedFiles.push(f);
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

  async analyzeFiles() {
    if (this.selectedFiles.length === 0) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const mergedData = await this.excelParser.readMultipleFiles(this.selectedFiles);
      this.quizState.setExcelData(mergedData);
      this.router.navigate(['/analysis']);
    } catch (error) {
      console.error('Error parsing files:', error);
      this.errorMessage = 'فشل في تحليل بعض ملفات الإكسل. يرجى التأكد من أن الملفات بصيغة .xlsx أو .xls جديدة.';
    } finally {
      this.isLoading = false;
    }
  }
}
