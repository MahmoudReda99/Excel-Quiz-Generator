import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { QuizQuestion } from '../../models/quiz.model';

@Component({
  selector: 'app-question-preview',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900">{{ 'preview.title' | translate }}</h3>
      <div *ngFor="let question of questions; let idx = index" class="bg-white shadow rounded-lg p-5">
        <div class="flex justify-between items-start mb-4">
          <h4 class="text-md font-semibold text-gray-800">{{idx + 1}}. {{ question.text }}</h4>
          <span class="px-2 py-1 text-xs font-semibold rounded-full" [ngClass]="question.type === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'">
            {{ question.type === 'single' ? ('mapping.single' | translate) : ('mapping.multiple' | translate) }}
          </span>
        </div>
        <div class="space-y-2">
          <div *ngFor="let choice of question.choices; let cIdx = index" 
               class="p-2 border rounded-md"
               [ngClass]="isChoiceCorrect(question, choice.id) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'">
            <div class="flex items-center">
              <span class="font-bold me-2 text-gray-500">{{ choice.label || getChoiceLabel(cIdx) }}.</span>
              <span [class.font-medium]="isChoiceCorrect(question, choice.id)" [class.text-green-800]="isChoiceCorrect(question, choice.id)">{{ choice.text }}</span>
              <svg *ngIf="isChoiceCorrect(question, choice.id)" class="ms-auto h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div *ngIf="question.explanation" class="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
          <strong>{{ 'review.explanation' | translate }}:</strong> {{ question.explanation }}
        </div>
      </div>
    </div>
  `
})
export class QuestionPreviewComponent {
  @Input() questions: QuizQuestion[] = [];

  getChoiceLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isChoiceCorrect(question: QuizQuestion, choiceId: string): boolean {
    if (!question.correctAnswer) return false;
    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.includes(choiceId);
    }
    return question.correctAnswer === choiceId;
  }
}
