import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuizStateService } from '../../services/quiz-state.service';
import { ReviewAnswerComponent } from '../../components/review-answer/review-answer.component';
import { QuestionSearchService, SearchMatchResult } from '../../services/question-search.service';
import { AnswerNormalizerService } from '../../services/answer-normalizer.service';
import { QuizQuestion, QuizConfig } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-review-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewAnswerComponent, TranslatePipe],
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

      <!-- Search & Filter Sticky Bar -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 sticky top-4 z-20 backdrop-blur-md bg-white/95">
        <!-- Search Input Field -->
        <div class="relative flex items-center">
          <span class="absolute start-4 text-gray-400 text-lg pointer-events-none">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            [placeholder]="'search.placeholder' | translate"
            class="w-full ps-11 pe-10 py-3 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-primary-500 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all shadow-inner"
          />
          <button
            *ngIf="searchQuery"
            (click)="clearSearch()"
            class="absolute end-3.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 text-base font-bold transition-all"
            title="Clear search">
            ✕
          </button>
        </div>

        <!-- Filter Buttons & Results Count Badge -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <div class="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              (click)="setFilter('all')"
              class="py-1.5 px-3 rounded-lg transition-all"
              [class.bg-primary-600]="activeFilter === 'all'"
              [class.text-white]="activeFilter === 'all'"
              [class.shadow-sm]="activeFilter === 'all'"
              [class.bg-gray-100]="activeFilter !== 'all'"
              [class.text-gray-700]="activeFilter !== 'all'"
              [class.hover:bg-gray-200]="activeFilter !== 'all'">
              {{ 'quiz.allQuestions' | translate }} ({{ questions.length }})
            </button>

            <button
              *ngIf="!isStudyMode"
              (click)="setFilter('correct')"
              class="py-1.5 px-3 rounded-lg transition-all"
              [class.bg-emerald-600]="activeFilter === 'correct'"
              [class.text-white]="activeFilter === 'correct'"
              [class.shadow-sm]="activeFilter === 'correct'"
              [class.bg-gray-100]="activeFilter !== 'correct'"
              [class.text-emerald-800]="activeFilter !== 'correct'"
              [class.hover:bg-gray-200]="activeFilter !== 'correct'">
              ✓ {{ 'review.correct' | translate }} ({{ correctCount }})
            </button>

            <button
              *ngIf="!isStudyMode"
              (click)="setFilter('wrong')"
              class="py-1.5 px-3 rounded-lg transition-all"
              [class.bg-rose-600]="activeFilter === 'wrong'"
              [class.text-white]="activeFilter === 'wrong'"
              [class.shadow-sm]="activeFilter === 'wrong'"
              [class.bg-gray-100]="activeFilter !== 'wrong'"
              [class.text-rose-800]="activeFilter !== 'wrong'"
              [class.hover:bg-gray-200]="activeFilter !== 'wrong'">
              ✗ {{ 'review.incorrect' | translate }} ({{ wrongCount }})
            </button>

            <button
              *ngIf="!isStudyMode && unansweredCount > 0"
              (click)="setFilter('unanswered')"
              class="py-1.5 px-3 rounded-lg transition-all"
              [class.bg-gray-800]="activeFilter === 'unanswered'"
              [class.text-white]="activeFilter === 'unanswered'"
              [class.shadow-sm]="activeFilter === 'unanswered'"
              [class.bg-gray-100]="activeFilter !== 'unanswered'"
              [class.text-gray-700]="activeFilter !== 'unanswered'"
              [class.hover:bg-gray-200]="activeFilter !== 'unanswered'">
              ⊘ {{ 'quiz.unanswered' | translate }} ({{ unansweredCount }})
            </button>
          </div>

          <!-- Matching count indicator -->
          <div class="text-xs font-bold text-gray-600 flex items-center gap-1.5 ms-auto">
            <span class="inline-block w-2 h-2 rounded-full" [class.bg-emerald-500]="filteredMatches.length > 0" [class.bg-rose-500]="filteredMatches.length === 0"></span>
            <span>
              {{ 'search.showing' | translate }} 
              <strong class="text-primary-700">{{ filteredMatches.length }}</strong> 
              {{ 'search.of' | translate }} {{ questions.length }} {{ 'search.resultsFound' | translate }}
            </span>
          </div>
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

      <!-- Empty Search Results View -->
      <div *ngIf="filteredMatches.length === 0" class="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4 shadow-sm">
        <div class="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-3xl mx-auto">
          🔍
        </div>
        <h3 class="text-lg font-black text-gray-900">
          {{ 'search.noResults' | translate }}
          <span *ngIf="searchQuery" class="text-primary-600">"{{ searchQuery }}"</span>
        </h3>
        <p class="text-sm text-gray-500 max-w-md mx-auto">
          {{ 'search.noResultsDesc' | translate }}
        </p>
        <div>
          <button
            (click)="clearSearch()"
            class="btn-secondary px-6 py-2.5 rounded-xl font-bold text-sm">
            {{ 'search.clear' | translate }}
          </button>
        </div>
      </div>

      <!-- Question Cards List -->
      <div class="space-y-6" *ngIf="filteredMatches.length > 0">
        <app-review-answer
          *ngFor="let item of filteredMatches"
          [question]="item.question"
          [questionNumber]="item.originalIndex + 1"
          [searchQuery]="searchQuery">
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
  filteredMatches: SearchMatchResult[] = [];
  backupQuestions: QuizQuestion[] = [];
  
  searchQuery: string = '';
  activeFilter: 'all' | 'correct' | 'wrong' | 'unanswered' = 'all';

  isStudyMode: boolean = false;
  duplicateCount: number = 0;
  duplicatesClearedMessage: string = '';

  get canRestoreDuplicates(): boolean {
    return this.backupQuestions.length > this.questions.length;
  }

  constructor(
    private quizStateService: QuizStateService,
    private searchService: QuestionSearchService,
    private normalizer: AnswerNormalizerService,
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
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  setFilter(filter: 'all' | 'correct' | 'wrong' | 'unanswered') {
    this.activeFilter = filter;
    this.applyFilters();
  }

  clearSearch() {
    this.searchQuery = '';
    this.activeFilter = 'all';
    this.applyFilters();
  }

  applyFilters() {
    this.filteredMatches = this.searchService.filterQuestions(
      this.questions,
      this.searchQuery,
      this.activeFilter
    );
  }

  get correctCount(): number {
    return this.questions.filter(q => {
      const isAnswered = q.type === 'multiple' 
        ? !!q.isSubmitted 
        : (q.userAnswer !== null && q.userAnswer !== undefined && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0));
      return isAnswered && this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
    }).length;
  }

  get wrongCount(): number {
    return this.questions.filter(q => {
      const isAnswered = q.type === 'multiple' 
        ? !!q.isSubmitted 
        : (q.userAnswer !== null && q.userAnswer !== undefined && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0));
      return isAnswered && !this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
    }).length;
  }

  get unansweredCount(): number {
    return this.questions.filter(q => {
      if (q.type === 'multiple') return !q.isSubmitted;
      return q.userAnswer === null || q.userAnswer === undefined || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0);
    }).length;
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
    this.applyFilters();
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
    this.applyFilters();
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
