import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizStateService } from '../../services/quiz-state.service';
import { ReviewAnswerComponent } from '../../components/review-answer/review-answer.component';
import { QuizQuestion, QuizConfig } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-review-page',
  standalone: true,
  imports: [CommonModule, ReviewAnswerComponent, TranslatePipe],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <!-- Top Banner -->
      <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            <span>{{ isStudyMode ? '📖' : '📋' }}</span>
            <span>{{ (isStudyMode ? 'review.studyTitle' : 'review.title') | translate }}</span>
          </h1>
          <p *ngIf="isStudyMode" class="text-sm font-semibold text-gray-600 mt-1">
            {{ 'review.studySubtitle' | translate }} (إجمالي: {{ questions.length }} سؤال)
          </p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button (click)="goBack()" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm transition-colors w-full sm:w-auto">
            {{ (isStudyMode ? 'review.backToAnalysis' : 'review.backResults') | translate }}
          </button>

          <button *ngIf="isStudyMode" (click)="startQuizNow()" class="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap">
            <span>{{ 'review.startQuizNow' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Duplicates Notice in Study Mode -->
      <div *ngIf="isStudyMode && duplicateCount > 0" class="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-sm font-semibold shadow-sm">
        <div class="flex items-center gap-2">
          <span class="text-xl">🔁</span>
          <div>
            <p>يوجد <span class="font-black text-amber-950">{{ duplicateCount }}</span> أسئلة مكررة في هذه القائمة.</p>
            <p class="text-xs text-amber-800 font-normal mt-0.5">يمكنك إزالة التكرار للاحتفاظ بنسخة واحدة فقط من كل سؤال مكرر.</p>
          </div>
        </div>
        <button 
          (click)="clearDuplicates()"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0">
          <span>🧹</span>
          <span>{{ 'validation.clearDuplicates' | translate }}</span>
        </button>
      </div>

      <!-- Duplicates Cleared Message with Undo Option -->
      <div *ngIf="isStudyMode && duplicatesClearedMessage" class="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 text-sm font-semibold shadow-sm">
        <div class="flex items-center gap-2">
          <span class="text-lg">✅</span>
          <span>{{ duplicatesClearedMessage }}</span>
        </div>
        <button 
          *ngIf="canRestoreDuplicates"
          (click)="restoreDuplicates()"
          class="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <span>↩️</span>
          <span>{{ 'validation.restoreDuplicates' | translate }}</span>
        </button>
      </div>

      <!-- Question cards -->
      <div class="space-y-6">
        <app-review-answer
          *ngFor="let q of questions; let i = index"
          [question]="q"
          [questionNumber]="i + 1">
        </app-review-answer>
      </div>

      <!-- Bottom Actions -->
      <div class="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button (click)="goBack()" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors w-full sm:w-auto">
          {{ (isStudyMode ? 'review.backToAnalysis' : 'review.backResults') | translate }}
        </button>

        <button *ngIf="isStudyMode && canRestoreDuplicates && duplicateCount === 0" (click)="restoreDuplicates()" class="px-5 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl font-bold text-sm transition-colors w-full sm:w-auto flex items-center justify-center gap-2">
          <span>↩️</span>
          <span>{{ 'validation.restoreDuplicates' | translate }}</span>
        </button>

        <button *ngIf="isStudyMode" (click)="startQuizNow()" class="btn-primary px-8 py-3.5 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2">
          <span>{{ 'review.startQuizNow' | translate }}</span>
        </button>
      </div>
    </div>
  `
})
export class ReviewPageComponent implements OnInit {
  questions: QuizQuestion[] = [];
  backupQuestions: QuizQuestion[] = [];
  isStudyMode: boolean = false;
  duplicateCount: number = 0;
  duplicatesClearedMessage: string = '';

  get canRestoreDuplicates(): boolean {
    return this.backupQuestions.length > this.questions.length;
  }

  constructor(
    private quizStateService: QuizStateService,
    private router: Router
  ) {}

  ngOnInit() {
    const state = this.quizStateService.getCurrentState();
    if (!state || !state.questions || state.questions.length === 0) {
      this.router.navigate(['/']);
      return;
    }
    this.questions = state.questions;
    this.backupQuestions = [];
    this.isStudyMode = state.status === 'study' || state.result === null;
    this.duplicateCount = this.quizStateService.getDuplicateCount(this.questions);
  }

  clearDuplicates() {
    const beforeCount = this.questions.length;
    this.backupQuestions = [...this.questions];
    this.quizStateService.setBackupQuestions(this.backupQuestions);

    this.questions = this.quizStateService.deduplicateQuestions(this.questions);
    const removedCount = beforeCount - this.questions.length;
    this.duplicateCount = 0;

    this.quizStateService.setQuestions(this.questions);
    this.quizStateService.setValidatedQuestions(this.questions);
    this.quizStateService.startStudyMode();

    this.duplicatesClearedMessage = `تمت إزالة ${removedCount} سؤال مكرر بنجاح، وتم الاحتفاظ بنسخة واحدة فريدة من كل سؤال (${this.questions.length} سؤال إجمالي).`;
  }

  restoreDuplicates() {
    if (this.backupQuestions.length === 0) return;
    this.questions = [...this.backupQuestions];
    this.backupQuestions = [];
    this.quizStateService.setBackupQuestions(null);
    this.duplicateCount = this.quizStateService.getDuplicateCount(this.questions);

    this.quizStateService.setQuestions(this.questions);
    this.quizStateService.setValidatedQuestions(this.questions);
    this.quizStateService.startStudyMode();

    this.duplicatesClearedMessage = '';
  }

  goBack() {
    if (this.isStudyMode) {
      this.router.navigate(['/analysis']);
    } else {
      this.router.navigate(['/results']);
    }
  }

  startQuizNow() {
    const defaultConfig: QuizConfig = {
      mode: 'exam',
      randomizeQuestions: true,
      randomizeAnswers: true,
      questionCount: 'all',
      timerMinutes: null
    };

    this.quizStateService.configureQuiz(defaultConfig);
    this.quizStateService.startQuiz();
    this.router.navigate(['/quiz']);
  }
}
