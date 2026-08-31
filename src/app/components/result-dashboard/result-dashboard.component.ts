import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizResult } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-result-dashboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100" *ngIf="result">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-gray-800 mb-6">{{ 'results.title' | translate }}</h2>
        
        <div class="relative w-48 h-48 mx-auto mb-4">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" stroke-width="10"></circle>
            <circle 
              cx="50" cy="50" r="45" fill="none" 
              [attr.stroke]="getScoreColor()" 
              stroke-width="10" 
              stroke-linecap="round"
              [attr.stroke-dasharray]="circumference"
              [attr.stroke-dashoffset]="dashoffset"
              class="transition-all duration-1000 ease-out">
            </circle>
          </svg>
          <div class="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
            <span class="text-4xl font-bold" [style.color]="getScoreColor()">{{ result.score }}%</span>
          </div>
        </div>
        <p class="text-xl font-medium text-gray-600">
          {{ result.correctCount }} / {{ result.totalQuestions }}
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-green-50 rounded-xl p-4 text-center">
          <div class="text-green-500 text-sm font-bold mb-1">{{ 'results.correct' | translate }}</div>
          <div class="text-2xl font-bold text-green-700">{{ result.correctCount }}</div>
        </div>
        <div class="bg-red-50 rounded-xl p-4 text-center">
          <div class="text-red-500 text-sm font-bold mb-1">{{ 'results.wrong' | translate }}</div>
          <div class="text-2xl font-bold text-red-700">{{ result.wrongCount }}</div>
        </div>
        <div class="bg-gray-100 rounded-xl p-4 text-center">
          <div class="text-gray-500 text-sm font-bold mb-1">{{ 'results.unanswered' | translate }}</div>
          <div class="text-2xl font-bold text-gray-700">{{ result.unansweredCount }}</div>
        </div>
        <div class="bg-blue-50 rounded-xl p-4 text-center">
          <div class="text-blue-500 text-sm font-bold mb-1">{{ 'results.timeUsed' | translate }}</div>
          <div class="text-2xl font-bold text-blue-700">{{ formatTime(result.timeUsed) }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button (click)="reviewAnswers.emit()" class="py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors">
          {{ 'results.reviewAnswers' | translate }}
        </button>
        <button (click)="retryQuiz.emit()" class="py-3 px-4 bg-white hover:bg-gray-50 text-primary-600 border border-primary-600 rounded-xl font-medium transition-colors">
          {{ 'results.retryQuiz' | translate }}
        </button>
        <button (click)="backHome.emit()" class="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors">
          {{ 'results.backHome' | translate }}
        </button>
        <button (click)="newFile.emit()" class="py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl font-medium transition-colors">
          {{ 'results.newFile' | translate }}
        </button>
      </div>
    </div>
  `
})
export class ResultDashboardComponent {
  @Input() result!: QuizResult;
  @Output() reviewAnswers = new EventEmitter<void>();
  @Output() retryQuiz = new EventEmitter<void>();
  @Output() backHome = new EventEmitter<void>();
  @Output() newFile = new EventEmitter<void>();

  get circumference(): number {
    return 2 * Math.PI * 45;
  }

  get dashoffset(): number {
    if (!this.result) return this.circumference;
    return this.circumference - (this.result.score / 100) * this.circumference;
  }

  getScoreColor(): string {
    if (!this.result) return '#9ca3af';
    if (this.result.score >= 80) return '#22c55e'; // green-500
    if (this.result.score >= 60) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
