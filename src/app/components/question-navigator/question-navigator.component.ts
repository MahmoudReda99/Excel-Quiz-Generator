import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizQuestion } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AnswerNormalizerService } from '../../services/answer-normalizer.service';
import { QuestionSearchService } from '../../services/question-search.service';

@Component({
  selector: 'app-question-navigator',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="space-y-3">
      <!-- Search Input Bar -->
      <div class="relative flex items-center">
        <span class="absolute start-3 text-gray-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          [placeholder]="'search.quickPlaceholder' | translate"
          class="w-full ps-9 pe-8 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 focus:border-primary-500 rounded-xl text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all"
        />
        <button
          *ngIf="searchQuery"
          (click)="searchQuery = ''"
          class="absolute end-2.5 p-0.5 rounded text-gray-400 hover:text-gray-700 text-xs font-bold"
          title="Clear">
          ✕
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl text-xs font-bold">
        <button 
          (click)="activeFilter = 'all'"
          class="flex-1 py-1.5 px-2.5 rounded-lg transition-all min-w-[60px]"
          [class.bg-white]="activeFilter === 'all'"
          [class.shadow-sm]="activeFilter === 'all'"
          [class.text-gray-900]="activeFilter === 'all'"
          [class.text-gray-600]="activeFilter !== 'all'">
          {{ 'quiz.allQuestions' | translate }} ({{ questions.length }})
        </button>
        
        <button 
          (click)="activeFilter = 'correct'"
          class="flex-1 py-1.5 px-2.5 rounded-lg transition-all min-w-[60px]"
          [class.bg-white]="activeFilter === 'correct'"
          [class.shadow-sm]="activeFilter === 'correct'"
          [class.text-emerald-700]="activeFilter === 'correct'"
          [class.text-gray-600]="activeFilter !== 'correct'">
          ✓ {{ 'review.correct' | translate }} ({{ correctCount }})
        </button>

        <button 
          (click)="activeFilter = 'wrong'"
          class="flex-1 py-1.5 px-2.5 rounded-lg transition-all min-w-[60px]"
          [class.bg-white]="activeFilter === 'wrong'"
          [class.shadow-sm]="activeFilter === 'wrong'"
          [class.text-rose-700]="activeFilter === 'wrong'"
          [class.text-gray-600]="activeFilter !== 'wrong'">
          ✗ {{ 'review.incorrect' | translate }} ({{ wrongCount }})
        </button>
        
        <button 
          (click)="activeFilter = 'unanswered'"
          class="flex-1 py-1.5 px-2.5 rounded-lg transition-all min-w-[60px]"
          [class.bg-white]="activeFilter === 'unanswered'"
          [class.shadow-sm]="activeFilter === 'unanswered'"
          [class.text-gray-800]="activeFilter === 'unanswered'"
          [class.text-gray-600]="activeFilter !== 'unanswered'">
          {{ 'quiz.unanswered' | translate }} ({{ unansweredCount }})
        </button>
      </div>

      <!-- Match status if query is active -->
      <div *ngIf="searchQuery" class="text-xs font-bold text-primary-700 px-1 flex items-center justify-between">
        <span>🔎 {{ visibleCount }} {{ 'search.resultsFound' | translate }}</span>
        <button (click)="searchQuery = ''" class="text-gray-500 hover:text-gray-800 underline">{{ 'search.clear' | translate }}</button>
      </div>

      <!-- Question Buttons Container with smooth scroll -->
      <div class="max-h-64 overflow-y-auto p-2 rounded-xl bg-gray-50 border border-gray-200 scrollbar-thin">
        <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2">
          <button
            *ngFor="let q of questions; let i = index"
            [hidden]="!shouldShowQuestion(i, q)"
            (click)="navigate.emit(i)"
            [ngClass]="getQuestionClass(q, i)">
            <span>{{ i + 1 }}</span>
          </button>
        </div>

        <div *ngIf="visibleCount === 0" class="text-center py-6 text-gray-500 text-xs font-semibold">
          {{ 'search.noResults' | translate }} "{{ searchQuery }}"
        </div>
      </div>

      <!-- Legend Footer -->
      <div class="flex flex-wrap items-center justify-between text-xs text-gray-600 pt-1 px-1 gap-2">
        <div class="flex items-center gap-1.5 font-bold">
          <span class="w-3.5 h-3.5 rounded-full bg-primary-600 ring-2 ring-primary-300"></span>
          <span>{{ 'quiz.current' | translate }}</span>
        </div>
        <div class="flex items-center gap-1.5 font-bold">
          <span class="w-3.5 h-3.5 rounded-full bg-emerald-600"></span>
          <span>{{ 'review.correct' | translate }}</span>
        </div>
        <div class="flex items-center gap-1.5 font-bold">
          <span class="w-3.5 h-3.5 rounded-full bg-rose-600"></span>
          <span>{{ 'review.incorrect' | translate }}</span>
        </div>
        <div class="flex items-center gap-1.5 font-bold">
          <span class="w-3.5 h-3.5 rounded-full bg-white border border-gray-400"></span>
          <span>{{ 'quiz.unanswered' | translate }}</span>
        </div>
      </div>
    </div>
  `
})
export class QuestionNavigatorComponent implements OnChanges {
  @Input() questions: QuizQuestion[] = [];
  @Input() currentIndex: number = 0;
  @Output() navigate = new EventEmitter<number>();

  searchQuery: string = '';
  activeFilter: 'all' | 'correct' | 'wrong' | 'unanswered' = 'all';

  constructor(
    private normalizer: AnswerNormalizerService,
    private searchService: QuestionSearchService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {}

  isSubmitted(q: QuizQuestion): boolean {
    if (q.type === 'multiple') {
      return !!q.isSubmitted;
    }
    return q.userAnswer !== null && 
           q.userAnswer !== undefined && 
           !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0);
  }

  isAnswered(q: QuizQuestion): boolean {
    return this.isSubmitted(q);
  }

  hasPendingSelections(q: QuizQuestion): boolean {
    return q.type === 'multiple' && 
           !q.isSubmitted && 
           Array.isArray(q.userAnswer) && 
           q.userAnswer.length > 0;
  }

  isCorrect(q: QuizQuestion): boolean {
    if (!this.isSubmitted(q)) return false;
    return this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
  }

  isWrong(q: QuizQuestion): boolean {
    if (!this.isSubmitted(q)) return false;
    return !this.isCorrect(q);
  }

  get correctCount(): number {
    return this.questions.filter(q => this.isCorrect(q)).length;
  }

  get wrongCount(): number {
    return this.questions.filter(q => this.isWrong(q)).length;
  }

  get unansweredCount(): number {
    return this.questions.filter(q => !this.isSubmitted(q)).length;
  }

  get visibleCount(): number {
    return this.questions.filter((q, idx) => this.shouldShowQuestion(idx, q)).length;
  }

  shouldShowQuestion(index: number, q: QuizQuestion): boolean {
    // 1. Status Filter Check
    if (this.activeFilter === 'correct' && !this.isCorrect(q)) return false;
    if (this.activeFilter === 'wrong' && !this.isWrong(q)) return false;
    if (this.activeFilter === 'unanswered' && this.isSubmitted(q)) return false;

    // 2. Search Query Check
    if (this.searchQuery && !this.searchService.matches(q, index, this.searchQuery)) {
      return false;
    }

    return true;
  }

  getQuestionClass(q: QuizQuestion, index: number): string {
    const isCurrent = this.currentIndex === index;
    const isCorr = this.isCorrect(q);
    const isWr = this.isWrong(q);
    const isPending = this.hasPendingSelections(q);

    const base = 'h-10 rounded-xl font-extrabold text-sm flex items-center justify-center transition-all duration-150 relative select-none cursor-pointer ';

    if (isCurrent) {
      const ring = 'ring-4 ring-primary-400 ring-offset-2 scale-105 z-10 ';
      if (isCorr) {
        return base + ring + 'bg-emerald-600 text-white hover:bg-emerald-700';
      }
      if (isWr) {
        return base + ring + 'bg-rose-600 text-white hover:bg-rose-700';
      }
      return base + ring + 'bg-primary-600 text-white hover:bg-primary-700';
    }

    if (isCorr) {
      return base + 'bg-emerald-600 text-white hover:bg-emerald-700';
    }
    if (isWr) {
      return base + 'bg-rose-600 text-white hover:bg-rose-700';
    }
    if (isPending) {
      return base + 'bg-primary-100 text-primary-800 border-2 border-primary-300 hover:bg-primary-200';
    }

    return base + 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 hover:text-gray-900';
  }
}
