import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { QuizQuestion } from '../../models/quiz.model';
import { QuestionSearchService, SearchMatchResult } from '../../services/question-search.service';

@Component({
  selector: 'app-question-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, HighlightPipe],
  template: `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>👁️</span> {{ 'preview.title' | translate }}
        </h3>
        
        <!-- Search bar -->
        <div class="relative w-full sm:w-72">
          <span class="absolute start-3 top-2.5 text-gray-400 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            [placeholder]="'search.quickPlaceholder' | translate"
            class="w-full ps-9 pe-8 py-1.5 bg-white border border-gray-300 focus:border-primary-500 rounded-xl text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all shadow-sm"
          />
          <button
            *ngIf="searchQuery"
            (click)="searchQuery = ''; onSearchChange()"
            class="absolute end-2.5 top-2 text-gray-400 hover:text-gray-700 text-xs font-bold"
            title="Clear">
            ✕
          </button>
        </div>
      </div>

      <div *ngIf="filteredList.length === 0" class="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        {{ 'search.noResults' | translate }} "{{ searchQuery }}"
      </div>

      <div *ngFor="let item of filteredList" class="bg-white shadow-sm border border-gray-200 rounded-xl p-5 space-y-3">
        <div class="flex justify-between items-start gap-3">
          <h4 class="text-base font-bold text-gray-900">
            <span class="text-primary-600 me-1">{{ item.originalIndex + 1 }}.</span>
            <span [innerHTML]="item.question.text | highlight:searchQuery"></span>
          </h4>
          <span class="px-2.5 py-1 text-xs font-bold rounded-full flex-shrink-0" [ngClass]="item.question.type === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'">
            {{ item.question.type === 'single' ? ('mapping.single' | translate) : ('mapping.multiple' | translate) }}
          </span>
        </div>

        <div class="space-y-2">
          <div *ngFor="let choice of item.question.choices; let cIdx = index" 
               class="p-2.5 border rounded-lg transition-colors"
               [ngClass]="isChoiceCorrect(item.question, choice.id) ? 'bg-green-50/80 border-green-300' : 'bg-gray-50 border-gray-200'">
            <div class="flex items-center">
              <span class="font-bold me-2 text-gray-500">{{ choice.label || getChoiceLabel(cIdx) }}.</span>
              <span [class.font-bold]="isChoiceCorrect(item.question, choice.id)" [class.text-green-900]="isChoiceCorrect(item.question, choice.id)" [innerHTML]="choice.text | highlight:searchQuery"></span>
              <span *ngIf="isChoiceCorrect(item.question, choice.id)" class="ms-auto text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">✓ {{ 'preview.correct' | translate }}</span>
            </div>
          </div>
        </div>

        <div *ngIf="item.question.explanation" class="mt-3 p-3 bg-blue-50 text-blue-900 rounded-lg text-xs font-medium border border-blue-100">
          <strong>💡 {{ 'review.explanation' | translate }}:</strong> 
          <span [innerHTML]="item.question.explanation | highlight:searchQuery"></span>
        </div>
      </div>
    </div>
  `
})
export class QuestionPreviewComponent implements OnChanges {
  @Input() questions: QuizQuestion[] = [];
  
  searchQuery: string = '';
  filteredList: SearchMatchResult[] = [];

  constructor(private searchService: QuestionSearchService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) {
      this.onSearchChange();
    }
  }

  onSearchChange() {
    this.filteredList = this.searchService.filterQuestions(this.questions, this.searchQuery);
  }

  getChoiceLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  isChoiceCorrect(question: QuizQuestion, choiceId: string): boolean {
    if (!question.correctAnswer) return false;
    const cleanId = String(choiceId).trim().toUpperCase();
    const choice = question.choices?.find(c => c.id === choiceId);
    const cleanLabel = choice?.label ? String(choice.label).trim().toUpperCase() : null;

    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.some(c => {
        const norm = String(c).trim().toUpperCase();
        return norm === cleanId || (cleanLabel !== null && norm === cleanLabel);
      });
    }
    const normCorrect = String(question.correctAnswer).trim().toUpperCase();
    return normCorrect === cleanId || (cleanLabel !== null && normCorrect === cleanLabel);
  }
}
