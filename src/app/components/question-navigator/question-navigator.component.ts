import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AnswerNormalizerService } from '../../services/answer-normalizer.service';

@Component({
  selector: 'app-question-navigator',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="space-y-4">
      <!-- Filter Tabs -->
      <div class="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl text-xs font-bold">
        <button 
          (click)="activeFilter = 'all'"
          class="flex-1 py-2 px-3 rounded-lg transition-all min-w-[70px]"
          [class.bg-white]="activeFilter === 'all'"
          [class.shadow-sm]="activeFilter === 'all'"
          [class.text-gray-900]="activeFilter === 'all'"
          [class.text-gray-600]="activeFilter !== 'all'">
          {{ 'quiz.allQuestions' | translate }} ({{ questions.length }})
        </button>
        
        <button 
          (click)="activeFilter = 'correct'"
          class="flex-1 py-2 px-3 rounded-lg transition-all min-w-[70px]"
          [class.bg-white]="activeFilter === 'correct'"
          [class.shadow-sm]="activeFilter === 'correct'"
          [class.text-emerald-700]="activeFilter === 'correct'"
          [class.text-gray-600]="activeFilter !== 'correct'">
          ✓ {{ 'review.correct' | translate }} ({{ correctCount }})
        </button>

        <button 
          (click)="activeFilter = 'wrong'"
          class="flex-1 py-2 px-3 rounded-lg transition-all min-w-[70px]"
          [class.bg-white]="activeFilter === 'wrong'"
          [class.shadow-sm]="activeFilter === 'wrong'"
          [class.text-rose-700]="activeFilter === 'wrong'"
          [class.text-gray-600]="activeFilter !== 'wrong'">
          ✗ {{ 'review.incorrect' | translate }} ({{ wrongCount }})
        </button>
        
        <button 
          (click)="activeFilter = 'unanswered'"
          class="flex-1 py-2 px-3 rounded-lg transition-all min-w-[70px]"
          [class.bg-white]="activeFilter === 'unanswered'"
          [class.shadow-sm]="activeFilter === 'unanswered'"
          [class.text-gray-800]="activeFilter === 'unanswered'"
          [class.text-gray-600]="activeFilter !== 'unanswered'">
          {{ 'quiz.unanswered' | translate }} ({{ unansweredCount }})
        </button>
      </div>

      <!-- Question Buttons Container with smooth scroll -->
      <div class="max-h-72 overflow-y-auto p-2 rounded-xl bg-gray-50 border border-gray-200 scrollbar-thin">
        <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2">
          <button
            *ngFor="let q of questions; let i = index"
            [hidden]="!shouldShowQuestion(i, q)"
            (click)="navigate.emit(i)"
            class="h-10 rounded-xl font-extrabold text-sm flex items-center justify-center transition-all duration-150 relative select-none"
            [class.ring-4]="currentIndex === i"
            [class.ring-primary-400]="currentIndex === i"
            [class.ring-offset-2]="currentIndex === i"
            [class.scale-105]="currentIndex === i"
            [class.z-10]="currentIndex === i"
            
            [class.bg-emerald-600]="isCorrect(q)"
            [class.text-white]="isCorrect(q) || isWrong(q) || currentIndex === i"
            [class.hover:bg-emerald-700]="isCorrect(q)"

            [class.bg-rose-600]="isWrong(q)"
            [class.hover:bg-rose-700]="isWrong(q)"

            [class.bg-white]="!isAnswered(q) && currentIndex !== i"
            [class.border]="!isAnswered(q) && currentIndex !== i"
            [class.border-gray-300]="!isAnswered(q) && currentIndex !== i"
            [class.text-gray-800]="!isAnswered(q) && currentIndex !== i"
            [class.hover:bg-gray-100]="!isAnswered(q) && currentIndex !== i">
            <span>{{ i + 1 }}</span>
          </button>
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

  activeFilter: 'all' | 'correct' | 'wrong' | 'unanswered' = 'all';

  constructor(private normalizer: AnswerNormalizerService) {}

  ngOnChanges(changes: SimpleChanges): void {}

  isAnswered(q: QuizQuestion): boolean {
    return q.userAnswer !== null && 
           q.userAnswer !== undefined && 
           !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0);
  }

  isCorrect(q: QuizQuestion): boolean {
    if (!this.isAnswered(q)) return false;
    return this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
  }

  isWrong(q: QuizQuestion): boolean {
    if (!this.isAnswered(q)) return false;
    return !this.isCorrect(q);
  }

  get correctCount(): number {
    return this.questions.filter(q => this.isCorrect(q)).length;
  }

  get wrongCount(): number {
    return this.questions.filter(q => this.isWrong(q)).length;
  }

  get unansweredCount(): number {
    return this.questions.filter(q => !this.isAnswered(q)).length;
  }

  shouldShowQuestion(index: number, q: QuizQuestion): boolean {
    if (this.activeFilter === 'all') return true;
    if (this.activeFilter === 'correct') return this.isCorrect(q);
    if (this.activeFilter === 'wrong') return this.isWrong(q);
    if (this.activeFilter === 'unanswered') return !this.isAnswered(q);
    return true;
  }
}
