import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizStateService } from '../../services/quiz-state.service';
import { ReviewAnswerComponent } from '../../components/review-answer/review-answer.component';
import { QuizQuestion } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-review-page',
  standalone: true,
  imports: [CommonModule, ReviewAnswerComponent, TranslatePipe],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">{{ 'review_answers' | translate }}</h1>
        <button (click)="goBack()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors">
          &larr; {{ 'back_to_results' | translate }}
        </button>
      </div>

      <div class="space-y-6">
        <app-review-answer
          *ngFor="let q of questions; let i = index"
          [question]="q"
          [questionNumber]="i + 1">
        </app-review-answer>
      </div>

      <div class="mt-8 text-center">
        <button (click)="goBack()" class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
          {{ 'back_to_results' | translate }}
        </button>
      </div>
    </div>
  `
})
export class ReviewPageComponent implements OnInit {
  questions: QuizQuestion[] = [];

  constructor(
    private quizStateService: QuizStateService,
    private router: Router
  ) {}

  ngOnInit() {
    const state = this.quizStateService.getCurrentState();
    if (!state || !state.questions || state.questions.length === 0) {
      this.router.navigate(['/']);
      return;
    }
    this.questions = state.questions;
  }

  goBack() {
    this.router.navigate(['/results']);
  }
}
