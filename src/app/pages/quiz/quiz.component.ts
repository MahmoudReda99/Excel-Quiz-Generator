import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QuizStateService } from '../../services/quiz-state.service';
import { TimerService } from '../../services/timer.service';
import { QuestionSearchService, SearchMatchResult } from '../../services/question-search.service';
import { QuizQuestionComponent } from '../../components/quiz-question/quiz-question.component';
import { QuestionNavigatorComponent } from '../../components/question-navigator/question-navigator.component';
import { TimerComponent } from '../../components/timer/timer.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HighlightPipe } from '../../pipes/highlight.pipe';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    QuizQuestionComponent,
    QuestionNavigatorComponent,
    TimerComponent,
    ProgressBarComponent,
    TranslatePipe,
    HighlightPipe
  ],
  template: `
    <div class="container mx-auto px-4 py-6 max-w-5xl space-y-6" *ngIf="quizState">
      <!-- Top Action & Timer Bar -->
      <div class="flex items-center justify-between gap-3">
        <!-- Quick Search Modal Trigger Button -->
        <button
          (click)="openSearchModal()"
          class="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm text-xs sm:text-sm font-bold text-gray-700 hover:text-primary-600 transition-all">
          <span>🔍</span>
          <span>{{ 'search.jumpToQuestion' | translate }}</span>
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] text-gray-500 font-mono">Ctrl+K</kbd>
        </button>

        <!-- Timer (if active) -->
        <div *ngIf="hasTimer" class="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
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
          (answerChanged)="onAnswer($event)"
          (togglePending)="onTogglePending()">
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
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
          <h3 class="font-bold text-gray-900 text-base flex items-center gap-2">
            <span>📋</span> {{ 'quiz.navigatorTitle' | translate }}
          </h3>
          <div class="flex items-center gap-2">
            <span *ngIf="pendingCount > 0" class="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
              🚩 {{ pendingCount }} {{ 'quiz.pending' | translate }}
            </span>
            <span class="text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              {{ answeredCount }}/{{ quizState.questions.length }} {{ 'quiz.answered' | translate }}
            </span>
          </div>
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

    <!-- Quick Question Search Modal Overlay -->
    <div 
      *ngIf="isSearchModalOpen"
      class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 animate-fadeIn"
      (click)="closeSearchModal()">
      <div 
        class="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scaleUp"
        (click)="$event.stopPropagation()">
        <!-- Search Input Header -->
        <div class="p-4 border-b border-gray-200 bg-gray-50/70 flex items-center gap-3">
          <span class="text-xl text-primary-600 flex-shrink-0">🔍</span>
          <input
            #modalSearchInput
            type="text"
            [(ngModel)]="modalSearchQuery"
            (ngModelChange)="onModalSearchChange()"
            (keydown.escape)="closeSearchModal()"
            [placeholder]="'search.placeholder' | translate"
            class="w-full bg-transparent border-none focus:outline-none text-base font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
          />
          <button
            *ngIf="modalSearchQuery"
            type="button"
            (click)="modalSearchQuery = ''; onModalSearchChange()"
            class="p-1 text-gray-400 hover:text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
            title="Clear">
            ✕
          </button>
          <button
            type="button"
            (click)="closeSearchModal()"
            class="px-2.5 py-1 bg-white hover:bg-gray-100 active:bg-gray-200 border border-gray-300 hover:border-gray-400 rounded-lg text-xs text-gray-600 font-mono font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1 flex-shrink-0 select-none"
            title="Close (ESC)">
            <span class="text-xs">✕</span>
            <span>ESC</span>
          </button>
        </div>

        <!-- Matching Questions List -->
        <div class="p-3 overflow-y-auto space-y-2 divide-y divide-gray-100">
          <div *ngIf="modalSearchResults.length === 0" class="p-8 text-center text-gray-500 text-sm">
            {{ 'search.noResults' | translate }} <span class="font-bold">"{{ modalSearchQuery }}"</span>
          </div>

          <div
            *ngFor="let item of modalSearchResults"
            (click)="selectSearchResult(item.originalIndex)"
            class="p-3.5 rounded-xl hover:bg-primary-50 cursor-pointer transition-colors border border-transparent hover:border-primary-200 space-y-1 group">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black text-primary-700 bg-primary-100/70 group-hover:bg-primary-200 px-2.5 py-0.5 rounded-full">
                {{ 'quiz.question' | translate }} {{ item.originalIndex + 1 }}
              </span>
              <span class="text-xs font-bold text-gray-400">
                {{ item.question.type === 'single' ? ('mapping.single' | translate) : ('mapping.multiple' | translate) }}
              </span>
            </div>
            <p class="text-sm font-semibold text-gray-900 line-clamp-2 leading-relaxed" [innerHTML]="item.question.text | highlight:modalSearchQuery"></p>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 bg-gray-50 border-t border-gray-200 text-xs font-semibold text-gray-500 flex items-center justify-between">
          <span>{{ 'search.showing' | translate }} {{ modalSearchResults.length }} {{ 'search.resultsFound' | translate }}</span>
          <span>اضغط على أي سؤال للانتقال إليه مباشرة</span>
        </div>
      </div>
    </div>
  `
})
export class QuizPageComponent implements OnInit, OnDestroy {
  quizState: any;
  currentIndex: number = 0;
  hasTimer: boolean = false;
  
  // Search Modal State
  @ViewChild('modalSearchInput') modalSearchInput?: ElementRef<HTMLInputElement>;
  isSearchModalOpen: boolean = false;
  modalSearchQuery: string = '';
  modalSearchResults: SearchMatchResult[] = [];

  private subs: Subscription = new Subscription();

  constructor(
    private quizStateService: QuizStateService,
    private timerService: TimerService,
    private searchService: QuestionSearchService,
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
    if (!this.quizState || !this.quizState.config) return false;
    if (this.quizState.config.mode === 'exam') {
      return false; // In exam mode, never lock questions or reveal answers mid-quiz
    }
    if (this.currentQuestion?.type === 'single') {
      return !!this.currentQuestion?.userAnswer;
    }
    return !!this.currentQuestion?.isSubmitted;
  }

  get isExamMode(): boolean {
    return this.quizState?.config?.mode === 'exam';
  }

  get answeredCount(): number {
    if (!this.quizState || !this.quizState.questions) return 0;
    return this.quizState.questions.filter((q: any) => {
      if (q.type === 'multiple') {
        return !!q.isSubmitted;
      }
      return q.userAnswer !== null && 
             q.userAnswer !== undefined && 
             !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0);
    }).length;
  }

  get pendingCount(): number {
    if (!this.quizState || !this.quizState.questions) return 0;
    return this.quizState.questions.filter((q: any) => !!q.isPending).length;
  }

  onTogglePending() {
    this.quizStateService.togglePending(this.currentIndex);
  }

  openSearchModal() {
    this.isSearchModalOpen = true;
    this.modalSearchQuery = '';
    this.onModalSearchChange();
    setTimeout(() => {
      this.modalSearchInput?.nativeElement?.focus();
    }, 50);
  }

  closeSearchModal() {
    this.isSearchModalOpen = false;
    this.modalSearchQuery = '';
  }

  onModalSearchChange() {
    if (!this.quizState?.questions) {
      this.modalSearchResults = [];
      return;
    }
    this.modalSearchResults = this.searchService.filterQuestions(
      this.quizState.questions,
      this.modalSearchQuery,
      'all'
    );
  }

  selectSearchResult(index: number) {
    this.goToQuestion(index);
    this.closeSearchModal();
  }

  onAnswer(answer: string | string[]) {
    this.quizStateService.answerQuestion(this.currentIndex, answer, this.currentQuestion?.isSubmitted);
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
    const total = this.quizState?.questions?.length || 0;
    const unanswered = total - this.answeredCount;
    const pending = this.pendingCount;

    if (pending > 0 || unanswered > 0) {
      const parts = [];
      if (pending > 0) {
        parts.push(`🚩 ${pending} سؤال مؤجل للمراجعة (Flagged/Pending)`);
      }
      if (unanswered > 0) {
        parts.push(`⚠️ ${unanswered} سؤال غير مجاب (Unanswered)`);
      }
      const msg = `تنبيه قبل التسليم:\n\nلديك:\n${parts.join('\n')}\n\nهل أنت متأكد من إنهاء وتسليم الاختبار الآن؟`;
      if (confirm(msg)) {
        this.submit();
      }
    } else {
      if (confirm('هل أنت متأكد من تسليم الاختبار الآن؟\nAre you sure you want to submit the quiz?')) {
        this.submit();
      }
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
    // Ctrl+K or Cmd+K to open search modal
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.isSearchModalOpen) {
        this.closeSearchModal();
      } else {
        this.openSearchModal();
      }
      return;
    }

    // Escape to close search modal
    if ((event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27) && this.isSearchModalOpen) {
      event.preventDefault();
      this.closeSearchModal();
      return;
    }

    if (this.isSearchModalOpen) return;

    // Ignore single key navigation/flag if user is in an input or textarea
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') return;

    // Toggle Flag / Pending with 'F' or 'P'
    if (event.key.toLowerCase() === 'f' || event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.onTogglePending();
      return;
    }

    if (event.key === 'ArrowRight') {
      this.nextQuestion();
    } else if (event.key === 'ArrowLeft') {
      this.previousQuestion();
    }
  }
}
