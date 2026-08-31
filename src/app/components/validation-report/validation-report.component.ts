import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ValidationResult } from '../../models/excel.model';

@Component({
  selector: 'app-validation-report',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="bg-white shadow rounded-lg p-6 space-y-4">
      <h3 class="text-lg font-medium text-gray-900">{{ 'validation.title' | translate }}</h3>
      
      <div class="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-md">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ validationResult.validCount }} {{ 'validation.validQuestions' | translate }}</span>
      </div>

      <div *ngIf="validationResult.issues && validationResult.issues.length > 0" class="flex items-center space-x-2 text-amber-700 bg-amber-50 p-3 rounded-md">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{{ validationResult.issues.length }} {{ 'validation.issuesFound' | translate }}</span>
      </div>

      <div *ngIf="validationResult.issues && validationResult.issues.length > 0" class="max-h-48 overflow-y-auto space-y-2 border border-gray-200 p-2 rounded-md">
        <div *ngFor="let issue of validationResult.issues" class="text-sm text-gray-700 flex items-start">
          <svg class="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Question {{ issue.questionIndex + 1 }}: {{ issue.message }}</span>
        </div>
      </div>

      <div class="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <button type="button" class="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" (click)="fixMapping.emit()">
          {{ 'validation.fixMapping' | translate }}
        </button>
        <button *ngIf="validationResult.issues && validationResult.issues.length > 0" type="button" class="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500" (click)="skipInvalid.emit()">
          {{ 'validation.skipInvalid' | translate }}
        </button>
        <button type="button" class="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" (click)="generateQuiz.emit()">
          {{ 'validation.generateQuiz' | translate }}
        </button>
      </div>
    </div>
  `
})
export class ValidationReportComponent {
  @Input() validationResult: ValidationResult = { validCount: 0, issues: [], isValid: true };
  @Output() fixMapping = new EventEmitter<void>();
  @Output() skipInvalid = new EventEmitter<void>();
  @Output() generateQuiz = new EventEmitter<void>();
}
