import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QuizStateService } from '../../services/quiz-state.service';
import { TimerService } from '../../services/timer.service';
import { QuizQuestionComponent } from '../../components/quiz-question/quiz-question.component';
import { QuestionNavigatorComponent } from '../../components/question-navigator/question-navigator.component';
import { TimerComponent } from '../../components/timer/timer.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [
    CommonModule,
    QuizQuestionComponent,
    QuestionNavigatorComponent,
    TimerComponent,
    ProgressBarComponent,
    TranslatePipe
  ],
  template: `
    <div class="container mx-auto px-4 py-6 max-w-5xl space-y-6" *ngIf="quizState">
      <!-- Timer Bar (Only if timer is active) -->
      <div *ngIf="hasTimer" class="flex justify-end">
        <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
          <span class="text-xl">⏱️</span>
          <app-timer></app-timer>
        </div>
      </div>

      <!-- Animated Progress Bar (Main Header Indicator) -->
      <app-progress-bar 
        [current]="currentIndex + 1" 
        [total]="quizState.questions.length"
        class="block">
      </app-progress-bar>

      <!-- Main Question Card -->
      <div class="space-y-6">
        <app-quiz-question
          [question]="currentQuestion"
          [questionNumber]="currentIndex + 1"
          [showResult]="showFeedback"
          (answerChanged)="onAnswer($event)">
        </app-quiz-question>

        <!-- Bottom Action Buttons -->
        <div class="flex items-center justify-between gap-4 pt-2">
          <button 
            (click)="previousQuestion()"
            [disabled]="currentIndex === 0"
            class="btn-secondary flex items-center gap-2 px-6 py-3"
            [class.opacity-40]="currentIndex === 0"
            [class.cursor-not-allowed]="currentIndex === 0">
            <span class="rtl:rotate-180">←</span>
            <span>{{ 'quiz.previous' | translate }}</span>
          </button>

          <button 
            *ngIf="currentIndex < quizState.questions.length - 1"
            (click)="nextQuestion()"
            class="btn-primary flex items-center gap-2 px-8 py-3">
            <span>{{ 'quiz.next' | translate }}</span>
            <span class="rtl:rotate-180">→</span>
          </button>

          <button 
            *ngIf="currentIndex === quizState.questions.length - 1"
            (click)="onSubmit()"
            class="btn-success flex items-center gap-2 px-8 py-3 text-lg font-bold">
            <span>✓ {{ 'quiz.submit' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Question Navigator Section (Placed UNDER Question Card on ALL screens) -->
      <div class="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200 mt-8 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 class="font-bold text-gray-900 text-base flex items-center gap-2">
            <span>📋</span> {{ 'quiz.navigatorTitle' | translate }}
          </h3>
          <span class="text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {{ answeredCount }}/{{ quizState.questions.length }} {{ 'quiz.answered' | translate }}
          </span>
        </div>

        <app-question-navigator
          [questions]="quizState.questions"
          [currentIndex]="currentIndex"
          (navigate)="goToQuestion($event)">
        </app-question-navigator>

        <div class="pt-3 border-t border-gray-100 flex justify-end">
          <button 
            (click)="onSubmit()"
            class="btn-success py-3 px-8 text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
            <span>✓ {{ 'quiz.finishQuiz' | translate }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class QuizPageComponent implements OnInit, OnDestroy {
  quizState: any;
  currentIndex: number = 0;
  hasTimer: boolean = false;
  
  private subs: Subscription = new Subscription();

  constructor(
    private quizStateService: QuizStateService,
    private timerService: TimerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subs.add(
      this.quizStateService.quizState$.subscribe(state => {
        if (!state || !state.questions || state.questions.length === 0) {
          this.router.navigate(['/']);
          return;
        }
        this.quizState = state;
        this.currentIndex = state.currentIndex || 0;
        this.hasTimer = !!state.config.timerMinutes;
      })
    );

    this.subs.add(
      this.timerService.timerExpired$.subscribe(expired => {
        if (expired) {
          this.autoSubmit();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get currentQuestion() {
    return this.quizState?.questions[this.currentIndex];
  }

  get showFeedback(): boolean {
    return false;
  }

  get answeredCount(): number {
    if (!this.quizState || !this.quizState.questions) return 0;
    return this.quizState.questions.filter((q: any) => 
      q.userAnswer !== null && 
      q.userAnswer !== undefined && 
      !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)
    ).length;
  }

  onAnswer(answer: string | string[]) {
    this.quizStateService.answerQuestion(this.currentIndex, answer);
  }

  nextQuestion() {
    if (this.currentIndex < this.quizState.questions.length - 1) {
      this.quizStateService.goToQuestion(this.currentIndex + 1);
    }
  }

  previousQuestion() {
    if (this.currentIndex > 0) {
      this.quizStateService.goToQuestion(this.currentIndex - 1);
    }
  }

  goToQuestion(index: number) {
    if (index >= 0 && index < this.quizState.questions.length) {
      this.quizStateService.goToQuestion(index);
    }
  }

  onSubmit() {
    if (confirm('Are you sure you want to submit the quiz?')) {
      this.submit();
    }
  }

  autoSubmit() {
    alert('Time is up! Submitting your quiz.');
    this.submit();
  }

  private submit() {
    this.timerService.stop();
    this.quizStateService.submitQuiz();
    this.router.navigate(['/results']);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      this.nextQuestion();
    } else if (event.key === 'ArrowLeft') {
      this.previousQuestion();
    }
  }
}
