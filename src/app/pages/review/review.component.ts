import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuizStateService } from '../../services/quiz-state.service';
import { ReviewAnswerComponent } from '../../components/review-answer/review-answer.component';
import { QuizQuestion, QuizConfig } from '../../models/quiz.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-review-page',
  standalone: true,
  imports: [CommonModule, ReviewAnswerComponent, TranslatePipe],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <!-- Top Banner -->
      <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            <span>{{ isStudyMode ? '📖' : '📋' }}</span>
            <span>{{ (isStudyMode ? 'review.studyTitle' : 'review.title') | translate }}</span>
          </h1>
          <p *ngIf="isStudyMode" class="text-sm font-semibold text-gray-600 mt-1">
            {{ 'review.studySubtitle' | translate }}
          </p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button (click)="goBack()" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm transition-colors w-full sm:w-auto">
            {{ (isStudyMode ? 'review.backToAnalysis' : 'review.backResults') | translate }}
          </button>

          <button *ngIf="isStudyMode" (click)="startQuizNow()" class="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap">
            <span>{{ 'review.startQuizNow' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Question cards -->
      <div class="space-y-6">
        <app-review-answer
          *ngFor="let q of questions; let i = index"
          [question]="q"
          [questionNumber]="i + 1">
        </app-review-answer>
      </div>

      <!-- Bottom Actions -->
      <div class="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button (click)="goBack()" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors w-full sm:w-auto">
          {{ (isStudyMode ? 'review.backToAnalysis' : 'review.backResults') | translate }}
        </button>

        <button *ngIf="isStudyMode" (click)="startQuizNow()" class="btn-primary px-8 py-3.5 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2">
          <span>{{ 'review.startQuizNow' | translate }}</span>
        </button>
      </div>
    </div>
  `
})
export class ReviewPageComponent implements OnInit {
  questions: QuizQuestion[] = [];
  isStudyMode: boolean = false;

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
    this.isStudyMode = state.status === 'study' || state.result === null;
  }

  goBack() {
    if (this.isStudyMode) {
      this.router.navigate(['/analysis']);
    } else {
      this.router.navigate(['/results']);
    }
  }

  startQuizNow() {
    const defaultConfig: QuizConfig = {
      mode: 'exam',
      randomizeQuestions: true,
      randomizeAnswers: true,
      questionCount: 'all',
      timerMinutes: null
    };

    this.quizStateService.configureQuiz(defaultConfig);
    this.quizStateService.startQuiz();
    this.router.navigate(['/quiz']);
  }
}
