import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ExcelData, ColumnMapping, DetectionResult, ValidationResult } from '../models/excel.model';
import { QuizQuestion, QuizState, QuizConfig, QuizResult } from '../models/quiz.model';
import { ScorerService } from './scorer.service';
import { AnswerNormalizerService } from './answer-normalizer.service';

@Injectable({
  providedIn: 'root'
})
export class QuizStateService {
  public excelData$ = new BehaviorSubject<ExcelData | null>(null);
  public columnMapping$ = new BehaviorSubject<ColumnMapping | null>(null);
  public detectionResult$ = new BehaviorSubject<DetectionResult | null>(null);
  public questions$ = new BehaviorSubject<QuizQuestion[]>([]);
  public validatedQuestions$ = new BehaviorSubject<QuizQuestion[]>([]);
  public validationResult$ = new BehaviorSubject<ValidationResult | null>(null);
  
  private defaultConfig: QuizConfig = {
    mode: 'exam',
    randomizeQuestions: true, // Enabled default question order randomization
    randomizeAnswers: true,   // Enabled default choice order randomization
    questionCount: 'all',
    timerMinutes: null
  };
  
  public quizConfig$ = new BehaviorSubject<QuizConfig>(this.defaultConfig);
  
  private defaultState: QuizState = {
    status: 'idle',
    currentIndex: 0,
    questions: [],
    config: this.defaultConfig,
    result: null,
    startTime: null
  };
  
  public quizState$ = new BehaviorSubject<QuizState>(this.defaultState);

  constructor(
    private scorerService: ScorerService,
    private normalizer: AnswerNormalizerService
  ) {}

  setExcelData(data: ExcelData): void {
    this.excelData$.next(data);
  }

  setColumnMapping(mapping: ColumnMapping): void {
    this.columnMapping$.next(mapping);
  }

  setDetectionResult(result: DetectionResult): void {
    this.detectionResult$.next(result);
  }

  setQuestions(questions: QuizQuestion[]): void {
    this.questions$.next(questions);
  }

  setValidationResult(result: ValidationResult): void {
    this.validationResult$.next(result);
  }

  setValidatedQuestions(questions: QuizQuestion[]): void {
    this.validatedQuestions$.next(questions);
  }

  configureQuiz(config: QuizConfig): void {
    this.quizConfig$.next(config);
    const state = this.quizState$.value;
    this.quizState$.next({ ...state, config });
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  startQuiz(): void {
    const config = this.quizConfig$.value;
    let pool = [...this.validatedQuestions$.value];

    if (config.randomizeQuestions) {
      pool = this.shuffleArray(pool);
    }

    if (config.questionCount !== 'all' && typeof config.questionCount === 'number') {
      pool = pool.slice(0, config.questionCount);
    }

    const finalQuestions = pool.map(q => {
      const newQ = { ...q, userAnswer: null };
      if (config.randomizeAnswers && newQ.choices && newQ.choices.length > 0) {
        newQ.choices = this.shuffleArray(newQ.choices);
      }
      return newQ;
    });

    const newState: QuizState = {
      ...this.quizState$.value,
      status: 'active',
      currentIndex: 0,
      questions: finalQuestions,
      startTime: new Date(),
      result: null
    };

    this.quizState$.next(newState);
  }

  answerQuestion(questionIndex: number, answer: string | string[]): void {
    const state = this.quizState$.value;
    const questions = [...state.questions];
    if (questionIndex >= 0 && questionIndex < questions.length) {
      questions[questionIndex] = { ...questions[questionIndex], userAnswer: answer };
      this.quizState$.next({ ...state, questions });
    }
  }

  goToQuestion(index: number): void {
    const state = this.quizState$.value;
    if (index >= 0 && index < state.questions.length) {
      this.quizState$.next({ ...state, currentIndex: index });
    }
  }

  nextQuestion(): void {
    const state = this.quizState$.value;
    if (state.currentIndex < state.questions.length - 1) {
      this.quizState$.next({ ...state, currentIndex: state.currentIndex + 1 });
    }
  }

  previousQuestion(): void {
    const state = this.quizState$.value;
    if (state.currentIndex > 0) {
      this.quizState$.next({ ...state, currentIndex: state.currentIndex - 1 });
    }
  }

  submitQuiz(): void {
    const state = this.quizState$.value;
    const endTime = new Date();
    const startTime = state.startTime || endTime;
    const result = this.scorerService.calculateResult(state.questions, startTime, endTime);
    this.quizState$.next({ ...state, status: 'submitted', result });
  }

  retryQuiz(): void {
    const state = this.quizState$.value;
    let pool = [...state.questions];
    if (state.config.randomizeQuestions) {
      pool = this.shuffleArray(pool);
    }
    const resetQuestions = pool.map(q => {
      const newQ = { ...q, userAnswer: null };
      if (state.config.randomizeAnswers && newQ.choices && newQ.choices.length > 0) {
        newQ.choices = this.shuffleArray(newQ.choices);
      }
      return newQ;
    });
    this.quizState$.next({
      ...state,
      status: 'active',
      currentIndex: 0,
      questions: resetQuestions,
      startTime: new Date(),
      result: null
    });
  }

  retakeWrongQuestions(): boolean {
    const state = this.quizState$.value;
    if (!state.result) return false;

    // Filter to questions that were incorrect or unanswered
    let wrongQuestions = state.questions.filter(q => {
      if (q.userAnswer === null || q.userAnswer === undefined) return true;
      if (Array.isArray(q.userAnswer) && q.userAnswer.length === 0) return true;
      return !this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
    });

    if (wrongQuestions.length === 0) return false;

    if (state.config.randomizeQuestions) {
      wrongQuestions = this.shuffleArray(wrongQuestions);
    }

    const resetQuestions = wrongQuestions.map(q => {
      const newQ = { ...q, userAnswer: null };
      if (state.config.randomizeAnswers && newQ.choices && newQ.choices.length > 0) {
        newQ.choices = this.shuffleArray(newQ.choices);
      }
      return newQ;
    });

    this.quizState$.next({
      ...state,
      status: 'active',
      currentIndex: 0,
      questions: resetQuestions,
      startTime: new Date(),
      result: null
    });

    return true;
  }

  getResult(): QuizResult | null {
    return this.quizState$.value.result;
  }

  getCurrentState(): QuizState {
    return this.quizState$.value;
  }

  getAvailableQuestionsCount(): number {
    return this.validatedQuestions$.value.length;
  }

  resetAll(): void {
    this.excelData$.next(null);
    this.columnMapping$.next(null);
    this.detectionResult$.next(null);
    this.questions$.next([]);
    this.validatedQuestions$.next([]);
    this.validationResult$.next(null);
    this.quizConfig$.next(this.defaultConfig);
    this.quizState$.next({ ...this.defaultState });
  }

  clearData(): void {
    this.resetAll();
    localStorage.clear();
  }
}
