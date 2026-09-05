import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ValidationResult } from '../../models/excel.model';

@Component({
  selector: 'app-validation-report',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 space-y-4">
      <h3 class="text-lg font-extrabold text-gray-900 flex items-center gap-2">
        <span>📊</span> {{ 'validation.title' | translate }}
      </h3>
      
      <div class="flex items-center space-x-2 rtl:space-x-reverse text-emerald-800 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 font-semibold text-sm">
        <svg class="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ validationResult.validCount }} {{ 'validation.validQuestions' | translate }}</span>
      </div>

      <div *ngIf="validationResult.issues && validationResult.issues.length > 0" class="flex items-center space-x-2 rtl:space-x-reverse text-amber-800 bg-amber-50 p-3.5 rounded-xl border border-amber-200 font-semibold text-sm">
        <svg class="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{{ validationResult.issues.length }} {{ 'validation.issuesFound' | translate }}</span>
      </div>

      <div *ngIf="validationResult.issues && validationResult.issues.length > 0" class="max-h-48 overflow-y-auto space-y-2 border border-gray-200 p-3 rounded-xl bg-gray-50 text-xs">
        <div *ngFor="let issue of validationResult.issues" class="text-gray-700 flex items-start font-medium">
          <svg class="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>السؤال {{ issue.questionIndex + 1 }}: {{ issue.message }}</span>
        </div>
      </div>

      <div class="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
        <button type="button" class="inline-flex justify-center items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors" (click)="fixMapping.emit()">
          ⚙️ {{ 'validation.fixMapping' | translate }}
        </button>
        
        <button *ngIf="validationResult.issues && validationResult.issues.length > 0" type="button" class="inline-flex justify-center items-center px-4 py-3 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors" (click)="skipInvalid.emit()">
          ⚠️ {{ 'validation.skipInvalid' | translate }}
        </button>

        <button type="button" class="inline-flex justify-center items-center px-5 py-3 border border-purple-300 shadow-sm text-sm font-bold rounded-xl text-purple-900 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors gap-2" (click)="studyMode.emit()">
          <span>📖</span>
          <span>{{ 'validation.studyMode' | translate }}</span>
        </button>

        <button type="button" class="inline-flex justify-center items-center px-6 py-3 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors gap-2" (click)="generateQuiz.emit()">
          <span>🚀</span>
          <span>{{ 'validation.generateQuiz' | translate }}</span>
        </button>
      </div>
    </div>
  `
})
export class ValidationReportComponent {
  @Input() validationResult: ValidationResult = { validCount: 0, issues: [], isValid: true };
  @Output() fixMapping = new EventEmitter<void>();
  @Output() skipInvalid = new EventEmitter<void>();
  @Output() studyMode = new EventEmitter<void>();
  @Output() generateQuiz = new EventEmitter<void>();
}
