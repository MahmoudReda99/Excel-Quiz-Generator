import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-question-navigator',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="space-y-4">
      <!-- Filter Tabs -->
      <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
        <button 
          (click)="activeFilter = 'all'"
          class="flex-1 py-1.5 px-2 rounded-lg transition-all"
          [class.bg-white]="activeFilter === 'all'"
          [class.shadow-sm]="activeFilter === 'all'"
          [class.text-primary-700]="activeFilter === 'all'"
          [class.text-gray-600]="activeFilter !== 'all'">
          {{ 'quiz.allQuestions' | translate }} ({{ questions.length }})
        </button>
        
        <button 
          (click)="activeFilter = 'answered'"
          class="flex-1 py-1.5 px-2 rounded-lg transition-all"
          [class.bg-white]="activeFilter === 'answered'"
          [class.shadow-sm]="activeFilter === 'answered'"
          [class.text-emerald-700]="activeFilter === 'answered'"
          [class.text-gray-600]="activeFilter !== 'answered'">
          ✓ {{ 'quiz.answered' | translate }} ({{ answeredCount }})
        </button>
        
        <button 
          (click)="activeFilter = 'unanswered'"
          class="flex-1 py-1.5 px-2 rounded-lg transition-all"
          [class.bg-white]="activeFilter === 'unanswered'"
          [class.shadow-sm]="activeFilter === 'unanswered'"
          [class.text-gray-800]="activeFilter === 'unanswered'"
          [class.text-gray-600]="activeFilter !== 'unanswered'">
          {{ 'quiz.unanswered' | translate }} ({{ unansweredCount }})
        </button>
      </div>

      <!-- Question Buttons Container with smooth scroll -->
      <div class="max-h-72 overflow-y-auto p-1 rounded-xl bg-gray-50 border border-gray-200 scrollbar-thin">
        <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          <button
            *ngFor="let q of questions; let i = index"
            [hidden]="!shouldShowQuestion(i, q)"
            (click)="navigate.emit(i)"
            class="h-10 rounded-xl font-bold text-sm flex items-center justify-center transition-all duration-150 relative select-none"
            [class.ring-4]="currentIndex === i"
            [class.ring-primary-400]="currentIndex === i"
            [class.ring-offset-2]="currentIndex === i"
            [class.bg-primary-600]="currentIndex === i"
            [class.text-white]="currentIndex === i || isAnswered(q)"
            [class.bg-emerald-600]="currentIndex !== i && isAnswered(q)"
            [class.hover:bg-emerald-700]="currentIndex !== i && isAnswered(q)"
            [class.bg-white]="currentIndex !== i && !isAnswered(q)"
            [class.border]="currentIndex !== i && !isAnswered(q)"
            [class.border-gray-300]="currentIndex !== i && !isAnswered(q)"
            [class.text-gray-800]="currentIndex !== i && !isAnswered(q)"
            [class.hover:bg-gray-100]="currentIndex !== i && !isAnswered(q)">
            <span>{{ i + 1 }}</span>
          </button>
        </div>
      </div>

      <!-- Legend Footer -->
      <div class="flex items-center justify-between text-xs text-gray-500 pt-1 px-1">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-primary-600 ring-2 ring-primary-300"></span>
          <span>{{ 'quiz.current' | translate }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-emerald-600"></span>
          <span>{{ 'quiz.answered' | translate }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-white border border-gray-400"></span>
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

  activeFilter: 'all' | 'answered' | 'unanswered' = 'all';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) {
      // Keep filter state consistent
    }
  }

  isAnswered(q: QuizQuestion): boolean {
    return q.userAnswer !== null && 
           q.userAnswer !== undefined && 
           !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0);
  }

  get answeredCount(): number {
    return this.questions.filter(q => this.isAnswered(q)).length;
  }

  get unansweredCount(): number {
    return this.questions.length - this.answeredCount;
  }

  shouldShowQuestion(index: number, q: QuizQuestion): boolean {
    if (this.activeFilter === 'all') return true;
    if (this.activeFilter === 'answered') return this.isAnswered(q);
    if (this.activeFilter === 'unanswered') return !this.isAnswered(q);
    return true;
  }
}
