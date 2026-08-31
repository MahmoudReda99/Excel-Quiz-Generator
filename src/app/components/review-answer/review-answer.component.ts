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
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 mb-6" *ngIf="question">
      <div class="flex items-start justify-between gap-3 mb-4">
        <h3 class="text-lg md:text-xl font-bold text-gray-900 leading-relaxed">
          <span class="text-primary-600 me-2">Q{{ questionNumber }}.</span>
          {{ question.text }}
        </h3>
        
        <span class="px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap flex-shrink-0"
          [class.bg-emerald-100]="isCorrect"
          [class.text-emerald-800]="isCorrect"
          [class.border]="isCorrect"
          [class.border-emerald-300]="isCorrect"
          [class.bg-rose-100]="isIncorrect"
          [class.text-rose-800]="isIncorrect"
          [class.border-rose-300]="isIncorrect"
          [class.bg-gray-100]="isUnanswered"
          [class.text-gray-700]="isUnanswered">
          <ng-container *ngIf="isCorrect">✓ {{ 'review.correct' | translate }}</ng-container>
          <ng-container *ngIf="isIncorrect">✗ {{ 'review.incorrect' | translate }}</ng-container>
          <ng-container *ngIf="isUnanswered">⊘ {{ 'review.unanswered' | translate }}</ng-container>
        </span>
      </div>

      <div class="space-y-3 mb-4">
        <div *ngFor="let choice of question.choices; let i = index"
          class="p-4 rounded-xl border-3 flex flex-col gap-2 transition-all w-full"
          [class.border-emerald-600]="isChoiceCorrect(choice.id)"
          [class.bg-emerald-50]="isChoiceCorrect(choice.id)"
          [class.border-rose-500]="isUserSelected(choice.id) && !isChoiceCorrect(choice.id)"
          [class.bg-rose-50]="isUserSelected(choice.id) && !isChoiceCorrect(choice.id)"
          [class.border-gray-200]="!isChoiceCorrect(choice.id) && !isUserSelected(choice.id)"
          [class.bg-gray-50]="!isChoiceCorrect(choice.id) && !isUserSelected(choice.id)">
          
          <!-- Choice Header: Label + Text -->
          <div class="flex items-start gap-3 w-full">
            <span class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700 flex-shrink-0 mt-0.5">
              {{ choice.label || getChoiceLabel(i) }}
            </span>
            <span class="text-base font-medium text-gray-900 leading-relaxed flex-grow break-words">
              {{ choice.text }}
            </span>
          </div>

          <!-- Choice Status Label Underneath Text -->
          <div *ngIf="isChoiceCorrect(choice.id) || isUserSelected(choice.id)" class="pt-1.5 border-t border-gray-200/60 w-full mt-1">
            <div *ngIf="isChoiceCorrect(choice.id) && isUserSelected(choice.id)" class="text-emerald-700 font-bold text-xs flex items-center gap-1.5 bg-emerald-100/90 px-3 py-1 rounded-lg border border-emerald-300 w-fit">
              <span>✓</span> 
              <span class="underline underline-offset-2">{{ 'review.correctAnswer' | translate }}</span>
              <span>({{ 'review.yourAnswer' | translate }})</span>
            </div>

            <div *ngIf="isChoiceCorrect(choice.id) && !isUserSelected(choice.id)" class="text-emerald-700 font-bold text-xs flex items-center gap-1.5 bg-emerald-100/90 px-3 py-1 rounded-lg border border-emerald-300 w-fit">
              <span>✓</span> 
              <span class="underline underline-offset-2">{{ 'review.correctAnswer' | translate }}</span>
            </div>

            <div *ngIf="isUserSelected(choice.id) && !isChoiceCorrect(choice.id)" class="text-rose-700 font-bold text-xs flex items-center gap-1.5 bg-rose-100/90 px-3 py-1 rounded-lg border border-rose-300 w-fit">
              <span>✗</span> 
              <span class="underline underline-offset-2">{{ 'review.yourAnswer' | translate }}</span>
              <span>({{ 'review.incorrect' | translate }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Explanation Text -->
      <div *ngIf="question.explanation" class="mt-4 p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-200">
        <h4 class="font-bold mb-1 text-sm flex items-center gap-2">
          <span>💡</span> {{ 'review.explanation' | translate }}:
        </h4>
        <p class="text-sm leading-relaxed text-blue-850">{{ question.explanation }}</p>
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
