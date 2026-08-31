import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizQuestion } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-quiz-question',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8" *ngIf="question">
      <!-- Badge Header -->
      <div class="flex items-center justify-between mb-4">
        <span class="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-bold rounded-full uppercase tracking-wider">
          {{ question.type === 'single' ? ('mapping.single' | translate) : ('mapping.multiple' | translate) }}
        </span>
        
        <span *ngIf="showResult || question.userAnswer" class="text-sm font-semibold">
          <span *ngIf="isUserAnswerCorrect" class="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ✓ {{ 'review.correct' | translate }}
          </span>
          <span *ngIf="!isUserAnswerCorrect && question.userAnswer" class="text-rose-600 flex items-center gap-1 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            ✗ {{ 'review.incorrect' | translate }}
          </span>
        </span>
      </div>

      <!-- Question Text -->
      <h2 class="text-xl md:text-2xl font-bold mb-8 text-gray-900 leading-relaxed">
        <span class="text-primary-600 me-2">Q{{ questionNumber }}.</span>
        {{ question.text }}
      </h2>

      <!-- Answer Choices -->
      <div class="space-y-4">
        <div 
          *ngFor="let choice of question.choices; let i = index"
          class="choice-card p-4 rounded-xl border-4 cursor-pointer transition-all duration-150 min-h-[64px] flex items-center justify-between select-none"
          [class.border-gray-200]="!isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
          [class.hover:border-primary-300]="!isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
          [class.border-primary-600]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
          [class.bg-primary-50]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
          [class.shadow-md]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
          [class.border-emerald-600]="shouldShowAnswerDetails && isChoiceCorrect(choice.id)"
          [class.bg-emerald-50]="shouldShowAnswerDetails && isChoiceCorrect(choice.id)"
          [class.border-rose-500]="shouldShowAnswerDetails && isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)"
          [class.bg-rose-50]="shouldShowAnswerDetails && isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)"
          (click)="onChoiceClick(choice.id)">
          
          <div class="flex items-center gap-4 w-full">
            <!-- Indicator Icon (Radio vs Checkbox) -->
            <div class="flex-shrink-0">
              <!-- Single Choice Radio Circle -->
              <div *ngIf="question.type === 'single'" 
                   class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                   [class.border-gray-400]="!isChoiceSelected(choice.id)"
                   [class.border-primary-600]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
                   [class.bg-primary-600]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
                   [class.border-emerald-600]="shouldShowAnswerDetails && isChoiceCorrect(choice.id)"
                   [class.bg-emerald-600]="shouldShowAnswerDetails && isChoiceCorrect(choice.id)"
                   [class.border-rose-600]="shouldShowAnswerDetails && isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)"
                   [class.bg-rose-600]="shouldShowAnswerDetails && isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)">
                <div *ngIf="isChoiceSelected(choice.id) || (shouldShowAnswerDetails && isChoiceCorrect(choice.id))" 
                     class="w-2.5 h-2.5 rounded-full bg-white"></div>
              </div>

              <!-- Multiple Choice Checkbox Box -->
              <div *ngIf="question.type === 'multiple'" 
                   class="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
                   [class.border-gray-400]="!isChoiceSelected(choice.id)"
                   [class.border-primary-600]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
                   [class.bg-primary-600]="isChoiceSelected(choice.id) && !shouldShowAnswerDetails"
                   [class.border-emerald-600]="shouldShowAnswerDetails && isChoiceCorrect(choice.id)"
                   [class.bg-emerald-600]="shouldShowAnswerDetails && isChoiceCorrect(choice.id)"
                   [class.border-rose-600]="shouldShowAnswerDetails && isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)"
                   [class.bg-rose-600]="shouldShowAnswerDetails && isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)">
                <span *ngIf="isChoiceSelected(choice.id) || (shouldShowAnswerDetails && isChoiceCorrect(choice.id))" 
                      class="text-white text-xs font-bold">✓</span>
              </div>
            </div>

            <!-- Choice Label & Text -->
            <div class="flex items-center gap-3 flex-grow">
              <span class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-700 flex-shrink-0">
                {{ choice.label || getChoiceLabel(i) }}
              </span>
              <span class="text-lg font-medium text-gray-900 leading-snug">{{ choice.text }}</span>
            </div>

            <!-- Status Indicator -->
            <div *ngIf="shouldShowAnswerDetails" class="flex-shrink-0 ms-2">
              <span *ngIf="isChoiceCorrect(choice.id)" class="text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                ✓ {{ 'review.correctAnswer' | translate }}
              </span>
              <span *ngIf="isChoiceSelected(choice.id) && !isChoiceCorrect(choice.id)" class="text-rose-700 font-bold text-xs bg-rose-100 px-3 py-1 rounded-full border border-rose-300">
                ✗ {{ 'review.yourAnswer' | translate }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right / Wrong Banner Feedback -->
      <div *ngIf="shouldShowAnswerDetails" class="mt-6">
        <div *ngIf="isUserAnswerCorrect" class="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-3">
          <span class="text-2xl">🎉</span>
          <div>
            <div class="font-bold text-base">{{ 'review.correct' | translate }}!</div>
            <div class="text-sm text-emerald-800">{{ getCorrectChoiceTexts() }}</div>
          </div>
        </div>

        <div *ngIf="!isUserAnswerCorrect" class="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 flex items-center gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <div class="font-bold text-base">{{ 'review.incorrect' | translate }}</div>
            <div class="text-sm text-rose-800">
              {{ 'review.correctAnswer' | translate }}: <strong class="underline">{{ getCorrectChoiceTexts() }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Explanation Text -->
      <div *ngIf="shouldShowAnswerDetails && question.explanation" class="mt-4 p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-200">
        <h4 class="font-bold mb-1 flex items-center gap-2">
          <span>💡</span> {{ 'review.explanation' | translate }}:
        </h4>
        <p class="text-sm leading-relaxed text-blue-850">{{ question.explanation }}</p>
      </div>
    </div>
  `
})
export class QuizQuestionComponent implements OnChanges {
  @Input() question!: QuizQuestion;
  @Input() questionNumber!: number;
  @Input() showResult: boolean = false;
  @Output() answerChanged = new EventEmitter<string | string[]>();

  selectedChoiceId: string | null = null;
  selectedChoiceIds: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question'] && this.question) {
      if (this.question.type === 'multiple') {
        this.selectedChoiceIds = Array.isArray(this.question.userAnswer) ? [...this.question.userAnswer] : [];
        this.selectedChoiceId = null;
      } else {
        this.selectedChoiceId = typeof this.question.userAnswer === 'string' ? this.question.userAnswer : null;
        this.selectedChoiceIds = [];
      }
    }
  }

  getChoiceLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isChoiceSelected(id: string): boolean {
    if (this.question.type === 'multiple') {
      return this.selectedChoiceIds.includes(id);
    }
    return this.selectedChoiceId === id;
  }

  isChoiceCorrect(choiceId: string): boolean {
    if (!this.question.correctAnswer) return false;
    if (Array.isArray(this.question.correctAnswer)) {
      return this.question.correctAnswer.includes(choiceId);
    }
    return this.question.correctAnswer === choiceId;
  }

  get shouldShowAnswerDetails(): boolean {
    return this.showResult || (this.question.userAnswer !== null && this.question.userAnswer !== undefined);
  }

  get isUserAnswerCorrect(): boolean {
    if (!this.question.userAnswer) return false;
    if (this.question.type === 'single') {
      return this.isChoiceCorrect(this.selectedChoiceId || '');
    }
    if (Array.isArray(this.question.correctAnswer)) {
      if (this.selectedChoiceIds.length !== this.question.correctAnswer.length) return false;
      return this.selectedChoiceIds.every(id => this.isChoiceCorrect(id));
    }
    return this.selectedChoiceIds.length === 1 && this.isChoiceCorrect(this.selectedChoiceIds[0]);
  }

  getCorrectChoiceTexts(): string {
    if (!this.question || !this.question.choices) return '';
    const correctChoices = this.question.choices.filter(c => this.isChoiceCorrect(c.id));
    return correctChoices.map(c => `${c.label || c.id}. ${c.text}`).join(', ');
  }

  onChoiceClick(id: string) {
    if (this.question.type === 'multiple') {
      const idx = this.selectedChoiceIds.indexOf(id);
      if (idx > -1) {
        this.selectedChoiceIds.splice(idx, 1);
      } else {
        this.selectedChoiceIds.push(id);
      }
      this.answerChanged.emit([...this.selectedChoiceIds]);
    } else {
      this.selectedChoiceId = id;
      this.answerChanged.emit(id);
    }
  }
}
