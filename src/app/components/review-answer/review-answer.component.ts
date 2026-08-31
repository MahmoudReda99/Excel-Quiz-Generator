import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AnswerNormalizerService } from '../../services/answer-normalizer.service';

@Component({
  selector: 'app-review-answer',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6" *ngIf="question">
      <div class="flex items-start justify-between mb-4">
        <h3 class="text-xl font-semibold text-gray-800">
          <span class="text-gray-500 me-2">Q{{ questionNumber }}.</span>
          {{ question.text }}
        </h3>
        
        <span class="px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
          [class.bg-green-100]="isCorrect"
          [class.text-green-700]="isCorrect"
          [class.bg-red-100]="isIncorrect"
          [class.text-red-700]="isIncorrect"
          [class.bg-gray-100]="isUnanswered"
          [class.text-gray-700]="isUnanswered">
          <ng-container *ngIf="isCorrect">✓ {{ 'review.correct' | translate }}</ng-container>
          <ng-container *ngIf="isIncorrect">✗ {{ 'review.incorrect' | translate }}</ng-container>
          <ng-container *ngIf="isUnanswered">⊘ {{ 'review.unanswered' | translate }}</ng-container>
        </span>
      </div>

      <div class="space-y-3 mb-6">
        <div *ngFor="let choice of question.choices; let i = index"
          class="p-3 rounded-lg border flex items-center justify-between"
          [class.border-green-500]="isChoiceCorrect(choice.id)"
          [class.bg-green-50]="isChoiceCorrect(choice.id)"
          [class.border-red-300]="isUserSelected(choice.id) && !isChoiceCorrect(choice.id)"
          [class.bg-red-50]="isUserSelected(choice.id) && !isChoiceCorrect(choice.id)"
          [class.border-gray-200]="!isChoiceCorrect(choice.id) && !isUserSelected(choice.id)">
          
          <div class="flex items-center gap-3">
            <span class="font-bold text-gray-500">{{ choice.label || getChoiceLabel(i) }}.</span>
            <span>{{ choice.text }}</span>
          </div>
          
          <div class="flex items-center gap-2">
            <span *ngIf="isChoiceCorrect(choice.id)" class="text-green-700 text-xs font-bold bg-green-100 px-2 py-1 rounded">
              {{ 'review.correctAnswer' | translate }}
            </span>
            <span *ngIf="isUserSelected(choice.id) && !isChoiceCorrect(choice.id)" class="text-red-700 text-xs font-bold bg-red-100 px-2 py-1 rounded">
              {{ 'review.yourAnswer' | translate }}
            </span>
            <span *ngIf="isChoiceCorrect(choice.id) && isUserSelected(choice.id)" class="text-green-700 text-xs font-bold bg-green-200 px-2 py-1 rounded">
              ✓ {{ 'review.yourAnswer' | translate }}
            </span>
          </div>
        </div>
      </div>

      <div *ngIf="question.explanation" class="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
        <h4 class="font-bold mb-1">{{ 'review.explanation' | translate }}:</h4>
        <p>{{ question.explanation }}</p>
      </div>
    </div>
  `
})
export class ReviewAnswerComponent {
  @Input() question!: QuizQuestion;
  @Input() questionNumber!: number;

  constructor(private normalizer: AnswerNormalizerService) {}

  getChoiceLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isUserSelected(choiceId: string): boolean {
    if (!this.question.userAnswer) return false;
    if (Array.isArray(this.question.userAnswer)) {
      return this.question.userAnswer.includes(choiceId);
    }
    return this.question.userAnswer === choiceId;
  }

  isChoiceCorrect(choiceId: string): boolean {
    if (!this.question.correctAnswer) return false;
    if (Array.isArray(this.question.correctAnswer)) {
      return this.question.correctAnswer.includes(choiceId);
    }
    return this.question.correctAnswer === choiceId;
  }

  get isUnanswered(): boolean {
    return this.question.userAnswer === null || 
           this.question.userAnswer === undefined || 
           (Array.isArray(this.question.userAnswer) && this.question.userAnswer.length === 0);
  }

  get isCorrect(): boolean {
    if (this.isUnanswered) return false;
    return this.normalizer.isCorrect(this.question.userAnswer, this.question.correctAnswer, this.question.type);
  }

  get isIncorrect(): boolean {
    if (this.isUnanswered) return false;
    return !this.isCorrect;
  }
}
