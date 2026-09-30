import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ExcelData, ColumnMapping, DetectionResult, ValidationResult } from '../models/excel.model';
import { QuizQuestion, QuizChoice, QuizState, QuizConfig, QuizResult } from '../models/quiz.model';
import { ScorerService } from './scorer.service';
import { AnswerNormalizerService } from './answer-normalizer.service';
import { AppStorageService } from './app-storage.service';

export interface ConflictingAnswerDetail {
  answer: string | string[];
  answerKey: string;
  count: number;
  sampleChoiceText?: string;
  sampleLabel?: string;
}

export interface ConflictingQuestionGroup {
  key: string;
  questionText: string;
  questions: QuizQuestion[];
  conflictingAnswers: ConflictingAnswerDetail[];
  choices: QuizChoice[];
  resolvedAnswer: string | string[] | null;
  isResolved: boolean;
}

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
    randomizeQuestions: true,
    randomizeAnswers: true,
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

  private lastActiveFileName: string = '';

  constructor(
    private scorerService: ScorerService,
    private normalizer: AnswerNormalizerService,
    private storageService: AppStorageService
  ) {
    this.quizState$.subscribe(state => {
      if (state.status === 'active' && state.questions && state.questions.length > 0) {
        const fileName = this.excelData$.value?.fileName || this.lastActiveFileName || 'اختبار مخصص';
        this.lastActiveFileName = fileName;
        this.storageService.saveActiveSession({
          id: 'current_active_session',
          fileName,
          updatedAt: new Date().toISOString(),
          quizState: state
        });
      }
    });
  }

  setActiveFileName(name: string): void {
    this.lastActiveFileName = name;
  }

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

  getQuestionKey(q: QuizQuestion): string {
    if (!q || !q.text || !q.text.trim()) return q?.id || Math.random().toString();
    const normalized = q.text
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/^(?:س\s*\d*|\d+)\s*[\/:\.\-\)\(]+\s*/gi, '')
      .replace(/[؟?.,:;!\-_()[\]{}"'«»"“”\/\\*#~^%&+=><]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return normalized || q.id;
  }

  getDuplicateCount(questions: QuizQuestion[]): number {
    if (!questions || questions.length <= 1) return 0;
    const seen = new Set<string>();
    let dupCount = 0;
    for (const q of questions) {
      const key = this.getQuestionKey(q);
      if (seen.has(key)) {
        dupCount++;
      } else {
        seen.add(key);
      }
    }
    return dupCount;
  }

  answersAreEqual(a: string | string[] | null | undefined, b: string | string[] | null | undefined): boolean {
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) return false;
    const normA = Array.isArray(a)
      ? a.map(x => String(x || '').trim().toUpperCase()).sort().join(',')
      : String(a || '').trim().toUpperCase();
    const normB = Array.isArray(b)
      ? b.map(x => String(x || '').trim().toUpperCase()).sort().join(',')
      : String(b || '').trim().toUpperCase();
    return normA === normB;
  }

  getConflictingQuestionGroups(questionsList?: QuizQuestion[]): ConflictingQuestionGroup[] {
    const questions = questionsList || this.validatedQuestions$.value;
    if (!questions || questions.length <= 1) return [];

    const groups = new Map<string, QuizQuestion[]>();
    for (const q of questions) {
      const key = this.getQuestionKey(q);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(q);
    }

    const conflictGroups: ConflictingQuestionGroup[] = [];

    for (const [key, qList] of groups.entries()) {
      if (qList.length <= 1) continue;

      const answerCounts = new Map<string, { answer: string | string[]; count: number }>();
      for (const q of qList) {
        const normKey = Array.isArray(q.correctAnswer)
          ? q.correctAnswer.map(x => String(x || '').trim().toUpperCase()).sort().join(',')
          : String(q.correctAnswer || '').trim().toUpperCase();

        if (!answerCounts.has(normKey)) {
          answerCounts.set(normKey, { answer: q.correctAnswer, count: 0 });
        }
        answerCounts.get(normKey)!.count++;
      }

      // If there are different answers among duplicate questions
      if (answerCounts.size > 1) {
        // Collect best/most complete choices across all duplicate instances
        let bestChoices: QuizChoice[] = [];
        for (const q of qList) {
          if (q.choices && q.choices.length > bestChoices.length) {
            bestChoices = q.choices;
          }
        }

        const conflictingAnswers: ConflictingAnswerDetail[] = [];
        for (const [normKey, item] of answerCounts.entries()) {
          let sampleText = '';
          let sampleLabel = '';
          if (typeof item.answer === 'string') {
            const matchedChoice = bestChoices.find(c => c.id === item.answer || c.label === item.answer);
            if (matchedChoice) {
              sampleText = matchedChoice.text;
              sampleLabel = matchedChoice.label || matchedChoice.id;
            } else {
              sampleLabel = item.answer;
              sampleText = item.answer;
            }
          } else if (Array.isArray(item.answer)) {
            sampleLabel = item.answer.join(', ');
            const texts = item.answer.map(ans => {
              const mc = bestChoices.find(c => c.id === ans || c.label === ans);
              return mc ? `${mc.label || mc.id}: ${mc.text}` : ans;
            });
            sampleText = texts.join(' + ');
          }

          conflictingAnswers.push({
            answer: item.answer,
            answerKey: normKey,
            count: item.count,
            sampleChoiceText: sampleText,
            sampleLabel: sampleLabel
          });
        }

        // Check if currently resolved
        const firstAns = qList[0].correctAnswer;
        const allSame = qList.every(q => this.answersAreEqual(q.correctAnswer, firstAns));

        conflictGroups.push({
          key,
          questionText: qList[0].text,
          questions: qList,
          conflictingAnswers,
          choices: bestChoices,
          resolvedAnswer: allSame ? firstAns : null,
          isResolved: allSame
        });
      }
    }

    return conflictGroups;
  }

  unifyQuestionAnswer(questionKey: string, chosenAnswer: string | string[]): void {
    // 1. Update validatedQuestions$
    const updatedValidated = this.validatedQuestions$.value.map(q => {
      if (this.getQuestionKey(q) === questionKey) {
        return { ...q, correctAnswer: chosenAnswer };
      }
      return q;
    });
    this.setValidatedQuestions(updatedValidated);

    // 2. Update questions$
    const updatedQuestions = this.questions$.value.map(q => {
      if (this.getQuestionKey(q) === questionKey) {
        return { ...q, correctAnswer: chosenAnswer };
      }
      return q;
    });
    this.setQuestions(updatedQuestions);

    // 3. Update backup questions if present
    if (this.backupBeforeDeduplication) {
      this.backupBeforeDeduplication = this.backupBeforeDeduplication.map(q => {
        if (this.getQuestionKey(q) === questionKey) {
          return { ...q, correctAnswer: chosenAnswer };
        }
        return q;
      });
    }

    // 4. Update quizState if active
    const currentState = this.quizState$.value;
    if (currentState && currentState.questions && currentState.questions.length > 0) {
      const updatedStateQ = currentState.questions.map(q => {
        if (this.getQuestionKey(q) === questionKey) {
          return { ...q, correctAnswer: chosenAnswer };
        }
        return q;
      });
      this.quizState$.next({
        ...currentState,
        questions: updatedStateQ
      });
    }
  }

  unifyAllConflictsByMajority(): number {
    const conflicts = this.getConflictingQuestionGroups();
    let resolvedCount = 0;
    for (const group of conflicts) {
      if (group.conflictingAnswers.length > 0) {
        // Find answer with maximum count
        const sorted = [...group.conflictingAnswers].sort((a, b) => b.count - a.count);
        const majorityAnswer = sorted[0].answer;
        this.unifyQuestionAnswer(group.key, majorityAnswer);
        resolvedCount++;
      }
    }
    return resolvedCount;
  }

  private backupBeforeDeduplication: QuizQuestion[] | null = null;

  deduplicateQuestions(questions: QuizQuestion[]): QuizQuestion[] {
    if (!questions || questions.length <= 1) return questions ? [...questions] : [];
    const seen = new Set<string>();
    const unique: QuizQuestion[] = [];
    for (const q of questions) {
      const key = this.getQuestionKey(q);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(q);
      }
    }
    return unique;
  }

  removeDuplicates(): number {
    const current = this.validatedQuestions$.value;
    this.backupBeforeDeduplication = [...current];
    const deduplicated = this.deduplicateQuestions(current);
    const removedCount = current.length - deduplicated.length;
    
    this.setQuestions(deduplicated);
    this.setValidatedQuestions(deduplicated);
    
    const currentState = this.quizState$.value;
    if (currentState && currentState.questions && currentState.questions.length > 0) {
      const stateDeduplicated = this.deduplicateQuestions(currentState.questions);
      this.quizState$.next({
        ...currentState,
        questions: stateDeduplicated
      });
    }
    return removedCount;
  }

  restoreDuplicates(): number {
    if (!this.backupBeforeDeduplication) return 0;
    const restored = [...this.backupBeforeDeduplication];
    this.setQuestions(restored);
    this.setValidatedQuestions(restored);

    const currentState = this.quizState$.value;
    if (currentState && currentState.questions && currentState.questions.length > 0) {
      this.quizState$.next({
        ...currentState,
        questions: restored
      });
    }
    this.backupBeforeDeduplication = null;
    return restored.length;
  }

  canRestoreDuplicates(): boolean {
    return this.backupBeforeDeduplication !== null && this.backupBeforeDeduplication.length > this.validatedQuestions$.value.length;
  }

  getBackupQuestions(): QuizQuestion[] | null {
    return this.backupBeforeDeduplication ? [...this.backupBeforeDeduplication] : null;
  }

  setBackupQuestions(questions: QuizQuestion[] | null): void {
    this.backupBeforeDeduplication = questions ? [...questions] : null;
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
      const newQ = { ...q, userAnswer: null, isSubmitted: false };
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

  startStudyMode(): void {
    const pool = [...this.validatedQuestions$.value];
    const studyQuestions = pool.map(q => ({
      ...q,
      userAnswer: null
    }));

    const newState: QuizState = {
      ...this.quizState$.value,
      status: 'study',
      currentIndex: 0,
      questions: studyQuestions,
      startTime: null,
      result: null
    };

    this.quizState$.next(newState);
  }

  answerQuestion(questionIndex: number, answer: string | string[], isSubmitted?: boolean): void {
    const state = this.quizState$.value;
    const questions = [...state.questions];
    if (questionIndex >= 0 && questionIndex < questions.length) {
      const updatedQ = { ...questions[questionIndex], userAnswer: answer };
      if (typeof isSubmitted === 'boolean') {
        updatedQ.isSubmitted = isSubmitted;
      }
      questions[questionIndex] = updatedQ;
      this.quizState$.next({ ...state, questions });
    }
  }

  togglePending(questionIndex: number): void {
    const state = this.quizState$.value;
    const questions = [...state.questions];
    if (questionIndex >= 0 && questionIndex < questions.length) {
      const currentPending = !!questions[questionIndex].isPending;
      questions[questionIndex] = {
        ...questions[questionIndex],
        isPending: !currentPending
      };
      this.quizState$.next({ ...state, questions });
    }
  }

  setPending(questionIndex: number, isPending: boolean): void {
    const state = this.quizState$.value;
    const questions = [...state.questions];
    if (questionIndex >= 0 && questionIndex < questions.length) {
      questions[questionIndex] = {
        ...questions[questionIndex],
        isPending
      };
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
    const finalizedQuestions = state.questions.map(q => {
      if (q.type === 'multiple' && Array.isArray(q.userAnswer) && q.userAnswer.length > 0) {
        return { ...q, isSubmitted: true };
      }
      return q;
    });
    const result = this.scorerService.calculateResult(finalizedQuestions, startTime, endTime);
    this.quizState$.next({ ...state, questions: finalizedQuestions, status: 'submitted', result });
    this.storageService.clearActiveSession();
  }

  retryQuiz(): void {
    const state = this.quizState$.value;
    let pool = [...state.questions];
    if (state.config.randomizeQuestions) {
      pool = this.shuffleArray(pool);
    }
    const resetQuestions = pool.map(q => {
      const newQ = { ...q, userAnswer: null, isSubmitted: false };
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
      const newQ = { ...q, userAnswer: null, isSubmitted: false };
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
    this.backupBeforeDeduplication = null;
    this.storageService.clearActiveSession();
  }

  clearData(): void {
    this.resetAll();
    localStorage.clear();
  }
}
