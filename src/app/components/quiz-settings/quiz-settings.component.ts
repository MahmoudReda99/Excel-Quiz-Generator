import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizConfig } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-quiz-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          class="border-2 rounded-xl p-4 cursor-pointer transition-all"
          [class.border-primary-500]="mode === 'practice'"
          [class.bg-primary-50]="mode === 'practice'"
          (click)="mode = 'practice'">
          <h3 class="text-xl font-bold mb-2">{{ 'practice_mode' | translate }}</h3>
          <p class="text-gray-600">{{ 'practice_mode_desc' | translate }}</p>
        </div>
        <div 
          class="border-2 rounded-xl p-4 cursor-pointer transition-all"
          [class.border-primary-500]="mode === 'exam'"
          [class.bg-primary-50]="mode === 'exam'"
          (click)="mode = 'exam'">
          <h3 class="text-xl font-bold mb-2">{{ 'exam_mode' | translate }}</h3>
          <p class="text-gray-600">{{ 'exam_mode_desc' | translate }}</p>
        </div>
      </div>

      <div class="space-y-4">
        <label class="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer">
          <input type="checkbox" [(ngModel)]="randomizeQuestions" class="form-checkbox h-5 w-5 text-primary-600 rounded">
          <span>{{ 'randomize_questions' | translate }}</span>
        </label>
        
        <label class="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer">
          <input type="checkbox" [(ngModel)]="randomizeAnswers" class="form-checkbox h-5 w-5 text-primary-600 rounded">
          <span>{{ 'randomize_answers' | translate }}</span>
        </label>
      </div>

      <div class="space-y-2">
        <h4 class="font-semibold">{{ 'question_count' | translate }} (Total: {{ totalQuestions }})</h4>
        <div class="flex flex-wrap gap-4">
          <label class="inline-flex items-center">
            <input type="radio" [(ngModel)]="questionCount" value="all" class="form-radio text-primary-600">
            <span class="ms-2">{{ 'all' | translate }}</span>
          </label>
          <label *ngFor="let count of [5, 10, 20, 30]" class="inline-flex items-center">
            <input type="radio" [(ngModel)]="questionCount" [value]="count" class="form-radio text-primary-600">
            <span class="ms-2">{{ count }}</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" [(ngModel)]="questionCount" value="custom" class="form-radio text-primary-600">
            <span class="ms-2">{{ 'custom' | translate }}</span>
          </label>
        </div>
        <div *ngIf="questionCount === 'custom'" class="mt-2">
          <input type="number" [(ngModel)]="customCount" class="form-input border rounded px-3 py-2 w-24" min="1" [max]="totalQuestions">
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="font-semibold">{{ 'timer' | translate }}</h4>
        <div class="flex flex-wrap gap-4">
          <label class="inline-flex items-center">
            <input type="radio" [(ngModel)]="timerMinutes" [value]="null" class="form-radio text-primary-600">
            <span class="ms-2">{{ 'no_timer' | translate }}</span>
          </label>
          <label *ngFor="let min of [5, 10, 20, 30]" class="inline-flex items-center">
            <input type="radio" [(ngModel)]="timerMinutes" [value]="min" class="form-radio text-primary-600">
            <span class="ms-2">{{ min }} {{ 'minutes' | translate }}</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" [(ngModel)]="timerMinutes" value="custom" class="form-radio text-primary-600">
            <span class="ms-2">{{ 'custom' | translate }}</span>
          </label>
        </div>
        <div *ngIf="timerMinutes === 'custom'" class="mt-2 flex items-center">
          <input type="number" [(ngModel)]="customTimer" class="form-input border rounded px-3 py-2 w-24" min="1">
          <span class="ms-2">{{ 'minutes' | translate }}</span>
        </div>
      </div>

      <button 
        (click)="onStart()" 
        class="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors">
        {{ 'start_quiz' | translate }}
      </button>
    </div>
  `
})
export class QuizSettingsComponent {
  @Input() totalQuestions: number = 0;
  @Output() startQuiz = new EventEmitter<QuizConfig>();

  mode: 'practice' | 'exam' = 'exam';
  randomizeQuestions: boolean = false;
  randomizeAnswers: boolean = false;
  questionCount: number | 'all' | 'custom' = 'all';
  customCount: number = 10;
  timerMinutes: number | 'custom' | null = null;
  customTimer: number = 15;

  onStart() {
    let finalCount = this.questionCount === 'all' ? this.totalQuestions : (this.questionCount === 'custom' ? this.customCount : this.questionCount);
    let finalTimer = this.timerMinutes === 'custom' ? this.customTimer : this.timerMinutes;

    this.startQuiz.emit({
      mode: this.mode,
      randomizeQuestions: this.randomizeQuestions,
      randomizeAnswers: this.randomizeAnswers,
      questionCount: finalCount,
      timerMinutes: finalTimer
    });
  }
}
