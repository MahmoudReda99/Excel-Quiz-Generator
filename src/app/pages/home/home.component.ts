import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { FileInfoComponent } from '../../components/file-info/file-info.component';
import { ExcelParserService } from '../../services/excel-parser.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ExcelData } from '../../models/excel.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FileUploadComponent, FileInfoComponent, TranslatePipe],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center">
      <div class="text-center mb-10">
        <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          {{ 'app.title' | translate }}
        </h1>
        <p class="mt-4 text-lg text-gray-500">
          {{ 'app.subtitle' | translate }}
        </p>
      </div>

      <div class="w-full space-y-6">
        <app-file-upload (fileSelected)="onFileSelected($event)"></app-file-upload>
        
        <div *ngIf="selectedFile && parsedData" class="space-y-6">
          <app-file-info 
            [fileName]="parsedData.fileName"
            [fileSize]="parsedData.fileSize"
            [sheetCount]="parsedData.sheets.length"
            [sheetNames]="sheetNames"
          ></app-file-info>

          <div class="flex justify-center">
            <button 
              type="button" 
              class="btn-primary text-lg px-8 py-4"
              [disabled]="isLoading"
              (click)="analyzeFile()"
            >
              {{ 'upload.analyze' | translate }}
            </button>
          </div>
        </div>

        <div *ngIf="isLoading" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600"></div>
          <p class="mt-2 text-gray-500">{{ 'common.loading' | translate }}</p>
        </div>

        <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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

  selectedFile: File | null = null;
  parsedData: ExcelData | null = null;
  isLoading = false;
  errorMessage = '';
  sheetNames: string[] = [];

  async onFileSelected(file: File) {
    this.selectedFile = file;
    this.isLoading = true;
    this.errorMessage = '';
    this.parsedData = null;
    try {
      this.parsedData = await this.excelParser.readFile(file);
      this.sheetNames = this.parsedData.sheets.map(s => s.name);
    } catch (error) {
      console.error('Error parsing file:', error);
      this.errorMessage = 'Failed to parse Excel file. Please check the file format.';
    } finally {
      this.isLoading = false;
    }
  }

  analyzeFile() {
    if (this.parsedData) {
      this.quizState.setExcelData(this.parsedData);
      this.router.navigate(['/analysis']);
    }
  }
}
