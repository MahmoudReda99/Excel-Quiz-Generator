import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ColumnMapperComponent } from '../../components/column-mapper/column-mapper.component';
import { QuestionPreviewComponent } from '../../components/question-preview/question-preview.component';
import { ValidationReportComponent } from '../../components/validation-report/validation-report.component';
import { ColumnDetectorService } from '../../services/column-detector.service';
import { QuestionBuilderService } from '../../services/question-builder.service';
import { ValidatorService } from '../../services/validator.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ColumnMapping, ExcelData, SheetInfo, ValidationResult } from '../../models/excel.model';
import { QuizQuestion, QuizConfig } from '../../models/quiz.model';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ColumnMapperComponent,
    QuestionPreviewComponent,
    ValidationReportComponent,
    TranslatePipe
  ],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" *ngIf="excelData">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-2xl font-black text-gray-900">{{ 'analysis.title' | translate }}</h2>
          <p *ngIf="excelData.isMultiFile" class="text-xs font-bold text-primary-700 mt-1">
            📚 تم دمج {{ excelData.files?.length }} ملفات إكسل مخصصة في بنك أسئلة موحد
          </p>
        </div>
        
        <div *ngIf="dataSheets.length > 1" class="flex items-center gap-2 w-full sm:w-auto">
          <label class="text-sm font-bold text-gray-700 whitespace-nowrap">{{ 'upload.sheets' | translate }}:</label>
          <select [(ngModel)]="selectedSheetIndex" (ngModelChange)="onSheetChange()" 
                  class="block w-full sm:w-72 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-xl border bg-white shadow-sm font-semibold text-gray-800">
            <option [ngValue]="-1">🌟 دمج جميع الملفات والأوراق (All Combined)</option>
            <option *ngFor="let sheet of dataSheets; let i = index" [ngValue]="i">{{ sheet.name }} ({{ sheet.rowCount }} أسئلة)</option>
          </select>
        </div>
      </div>

      <!-- Multi-File Summary Banner -->
      <div *ngIf="excelData.isMultiFile && isCombinedMode" class="card bg-blue-50 border-blue-200 p-4 space-y-2">
        <h4 class="font-bold text-blue-900 text-sm flex items-center gap-2">
          <span>📦</span> الملفات المدمجة في هذا الاختبار:
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-semibold">
          <div *ngFor="let f of excelData.files" class="bg-white p-2.5 rounded-lg border border-blue-200 text-blue-950 flex items-center justify-between">
            <span class="truncate me-1">📄 {{ f.fileName }}</span>
            <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0">{{ f.sheetCount }} أوراق</span>
          </div>
        </div>
      </div>

      <!-- Auto-detected banner -->
      <div *ngIf="!showManualMapping && confidence === 'high'" 
           class="card bg-emerald-50 border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div class="flex items-center text-emerald-800">
          <svg class="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">
            {{ isCombinedMode ? 'تم اكتشاف ودمج جميع أسئلة الملفات بنجاح' : ('analysis.autoDetected' | translate) }}
          </span>
        </div>
        <button type="button" class="text-sm font-medium text-primary-600 hover:text-primary-500" (click)="showManualMapping = true">
          {{ 'analysis.mapManually' | translate }}
        </button>
      </div>

      <!-- Detection info cards -->
      <div *ngIf="!showManualMapping && confidence === 'high'" class="card space-y-3">
        <div class="flex items-center gap-2" *ngIf="currentSheet">
          <span class="text-emerald-500">✓</span>
          <span class="font-medium text-gray-700">{{ 'analysis.questionCol' | translate }}:</span>
          <span class="text-gray-600">{{ mapping.questionCol !== null ? currentSheet.headers[mapping.questionCol] : '—' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-emerald-500">✓</span>
          <span class="font-medium text-gray-700">{{ 'analysis.choiceCols' | translate }}:</span>
          <span class="text-gray-600">{{ getChoiceNames() }}</span>
        </div>
        <div class="flex items-center gap-2" *ngIf="currentSheet">
          <span class="text-emerald-500">✓</span>
          <span class="font-medium text-gray-700">{{ 'analysis.correctAnswer' | translate }}:</span>
          <span class="text-gray-600">{{ mapping.correctAnswerCol !== null ? currentSheet.headers[mapping.correctAnswerCol] : '—' }}</span>
        </div>
      </div>

      <!-- Manual mapping -->
      <div *ngIf="showManualMapping || confidence !== 'high'">
        <app-column-mapper 
          [headers]="currentSheet ? currentSheet.headers : []" 
          [mapping]="mapping" 
          (mappingChanged)="onMappingChanged($event)">
        </app-column-mapper>
      </div>

      <!-- Validation Report Section -->
      <div class="max-w-2xl mx-auto w-full" *ngIf="allQuestions.length > 0">
        <app-validation-report 
          [validationResult]="validationResult"
          (fixMapping)="showManualMapping = true"
          (skipInvalid)="onSkipInvalid()"
          (studyMode)="onStudyMode()"
          (generateQuiz)="onGenerateQuiz()">
        </app-validation-report>
      </div>

      <!-- No questions message -->
      <div *ngIf="allQuestions.length === 0 && currentSheet" class="card text-center py-8 text-gray-500">
        <p>{{ 'validation.noQuestions' | translate }}</p>
        <button class="btn-secondary mt-4" (click)="showManualMapping = true">
          {{ 'analysis.mapManually' | translate }}
        </button>
      </div>
    </div>
  `
})
export class AnalysisComponent implements OnInit {
  private detector = inject(ColumnDetectorService);
  private builder = inject(QuestionBuilderService);
  private validator = inject(ValidatorService);
  private quizState = inject(QuizStateService);
  private router = inject(Router);

  excelData: ExcelData | null = null;
  selectedSheetIndex = -1; // Default -1 = Combined Mode (all sheets & files)
  dataSheets: SheetInfo[] = [];
  currentSheet: SheetInfo | null = null;
  
  mapping: ColumnMapping = {
    questionCol: null,
    choiceCols: [],
    correctAnswerCol: null,
    typeCol: null,
    explanationCol: null,
    difficultyCol: null
  };
  confidence: 'high' | 'medium' | 'low' = 'low';
  showManualMapping = false;

  allQuestions: QuizQuestion[] = [];
  previewQuestions: QuizQuestion[] = [];
  validationResult: ValidationResult = { validCount: 0, issues: [], isValid: false };

  ngOnInit() {
    const data = this.quizState.excelData$.value;
    if (!data) {
      this.router.navigate(['/']);
      return;
    }
    this.excelData = data;
    this.dataSheets = data.sheets.filter(s => s.rowCount > 0);
    if (this.dataSheets.length > 0) {
      this.selectedSheetIndex = (this.dataSheets.length > 1 || data.isMultiFile) ? -1 : 0;
      this.loadSheetData();
    }
  }

  get isCombinedMode(): boolean {
    return this.selectedSheetIndex === -1;
  }

  onSheetChange() {
    this.loadSheetData();
  }

  loadSheetData() {
    if (this.isCombinedMode) {
      this.processAllSheetsCombined();
    } else {
      this.currentSheet = this.dataSheets[this.selectedSheetIndex];
      if (this.currentSheet) {
        this.detectColumns();
      }
    }
  }

  processAllSheetsCombined() {
    let combinedQuestions: QuizQuestion[] = [];
    this.confidence = 'high';
    
    // First sheet header for display
    this.currentSheet = this.dataSheets[0];
    if (this.currentSheet) {
      const result = this.detector.detect(this.currentSheet);
      this.mapping = result.mapping;
    }

    this.dataSheets.forEach(sheet => {
      const sheetResult = this.detector.detect(sheet);
      if (sheetResult.mapping.questionCol !== null && sheetResult.mapping.correctAnswerCol !== null) {
        const qList = this.builder.buildQuestions(sheet, sheetResult.mapping);
        combinedQuestions = combinedQuestions.concat(qList);
      }
    });

    this.allQuestions = combinedQuestions;
    this.previewQuestions = this.allQuestions.slice(0, 3);
    this.validationResult = this.validator.validate(this.allQuestions);
  }

  detectColumns() {
    if (!this.currentSheet) return;
    const result = this.detector.detect(this.currentSheet);
    this.mapping = result.mapping;
    this.confidence = result.confidence;
    this.showManualMapping = this.confidence !== 'high';
    this.quizState.setDetectionResult(result);
    this.quizState.setColumnMapping(this.mapping);
    this.processQuestions();
  }

  onMappingChanged(newMapping: ColumnMapping) {
    this.mapping = newMapping;
    this.quizState.setColumnMapping(this.mapping);
    this.processQuestions();
  }

  processQuestions() {
    if (!this.currentSheet) return;
    this.allQuestions = this.builder.buildQuestions(this.currentSheet, this.mapping);
    this.previewQuestions = this.allQuestions.slice(0, 3);
    this.validationResult = this.validator.validate(this.allQuestions);
  }

  onSkipInvalid() {
    const invalidIndices = new Set(this.validationResult.issues.map(i => i.questionIndex));
    this.allQuestions = this.allQuestions.filter((_, idx) => !invalidIndices.has(idx));
    this.previewQuestions = this.allQuestions.slice(0, 3);
    this.validationResult = this.validator.validate(this.allQuestions);
  }

  onStudyMode() {
    this.quizState.setQuestions(this.allQuestions);
    this.quizState.setValidatedQuestions(this.allQuestions);
    this.quizState.setValidationResult(this.validationResult);
    this.quizState.startStudyMode();
    this.router.navigate(['/review']);
  }

  onGenerateQuiz() {
    this.quizState.setQuestions(this.allQuestions);
    this.quizState.setValidatedQuestions(this.allQuestions);
    this.quizState.setValidationResult(this.validationResult);

    const defaultConfig: QuizConfig = {
      mode: 'exam',
      randomizeQuestions: true,
      randomizeAnswers: true,
      questionCount: 'all',
      timerMinutes: null
    };

    this.quizState.configureQuiz(defaultConfig);
    this.quizState.startQuiz();
    this.router.navigate(['/quiz']);
  }

  getChoiceNames(): string {
    if (!this.currentSheet) return '—';
    if (this.mapping.choiceCols.length === 0) {
      return 'صح / خطأ (تلقائي)';
    }
    return this.mapping.choiceCols
      .map(i => this.currentSheet!.headers[i] || `Column ${i}`)
      .join(', ');
  }
}
