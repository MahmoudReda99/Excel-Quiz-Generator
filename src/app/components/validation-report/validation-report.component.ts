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
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Valid Questions Count Card -->
        <div class="flex items-center space-x-2 rtl:space-x-reverse text-emerald-800 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 font-semibold text-sm">
          <svg class="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>
            <strong class="font-black text-base text-emerald-950">{{ validationResult.validCount }}</strong>
            {{ 'validation.validQuestions' | translate }}
          </span>
        </div>

        <!-- Duplicates Counter Card (Untruncated & Clear) -->
        <div *ngIf="duplicateCount > 0" class="flex items-center space-x-2 rtl:space-x-reverse text-amber-900 bg-amber-50 p-3.5 rounded-xl border border-amber-300 font-semibold text-sm">
          <span class="text-xl flex-shrink-0">🔁</span>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span>تم اكتشاف</span>
            <strong class="font-black text-base text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-lg">{{ duplicateCount }}</strong>
            <span>{{ 'validation.duplicatesFound' | translate }}</span>
          </div>
        </div>

        <!-- No Duplicates Card -->
        <div *ngIf="duplicateCount === 0 && (totalCount > 0 || validationResult.validCount > 0)" class="flex items-center space-x-2 rtl:space-x-reverse text-teal-800 bg-teal-50 p-3.5 rounded-xl border border-teal-200 font-semibold text-sm">
          <span class="text-base">✨</span>
          <span>{{ 'validation.noDuplicates' | translate }}</span>
        </div>
      </div>

      <!-- Success Notification when Duplicates Cleared with Undo Option -->
      <div *ngIf="duplicatesClearedMessage" class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 bg-emerald-100/70 p-4 rounded-xl border border-emerald-300 font-semibold text-sm shadow-sm">
        <div class="flex items-center space-x-2 rtl:space-x-reverse">
          <span class="text-xl flex-shrink-0">✅</span>
          <span>{{ duplicatesClearedMessage }}</span>
        </div>
        <button 
          *ngIf="canRestoreDuplicates" 
          type="button" 
          (click)="restoreDuplicates.emit()"
          class="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <span>↩️</span>
          <span>{{ 'validation.restoreDuplicates' | translate }}</span>
        </button>
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

        <!-- Clear Duplicates Action Button with Exact Count -->
        <button 
          *ngIf="duplicateCount > 0" 
          type="button" 
          class="inline-flex justify-center items-center px-5 py-3 border border-amber-400 shadow-sm text-sm font-extrabold rounded-xl text-amber-950 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all gap-2" 
          (click)="clearDuplicates.emit()">
          <span class="text-base">🧹</span>
          <span>إزالة التكرار (حذف {{ duplicateCount }} مكرر والإبقاء على نسخة واحدة)</span>
        </button>

        <!-- Restore / Undo Duplicates Button -->
        <button 
          *ngIf="canRestoreDuplicates && duplicateCount === 0" 
          type="button" 
          class="inline-flex justify-center items-center px-5 py-3 border border-emerald-300 shadow-sm text-sm font-bold rounded-xl text-emerald-950 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all gap-2" 
          (click)="restoreDuplicates.emit()">
          <span>↩️</span>
          <span>{{ 'validation.restoreDuplicates' | translate }}</span>
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
  @Input() duplicateCount: number = 0;
  @Input() totalCount: number = 0;
  @Input() duplicatesClearedMessage: string = '';
  @Input() canRestoreDuplicates: boolean = false;
  @Output() fixMapping = new EventEmitter<void>();
  @Output() skipInvalid = new EventEmitter<void>();
  @Output() clearDuplicates = new EventEmitter<void>();
  @Output() restoreDuplicates = new EventEmitter<void>();
  @Output() studyMode = new EventEmitter<void>();
  @Output() generateQuiz = new EventEmitter<void>();
}
