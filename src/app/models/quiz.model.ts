export interface QuizQuestion {
  id: string;
  text: string;
  choices: QuizChoice[];
  correctAnswer: string | string[];
  type: 'single' | 'multiple';
  explanation: string | null;
  difficulty: number | null;
  userAnswer: string | string[] | null;
  isSubmitted?: boolean;
}

export interface QuizChoice {
  id: string;
  text: string;
  label: string;
}

export interface QuizConfig {
  mode: 'practice' | 'exam';
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  questionCount: number | 'all';
  timerMinutes: number | null;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  timeUsed: number;
  questions: QuizQuestion[];
}

export interface QuizState {
  status: 'idle' | 'ready' | 'active' | 'submitted' | 'study';
  currentIndex: number;
  questions: QuizQuestion[];
  config: QuizConfig;
  result: QuizResult | null;
  startTime: Date | null;
}
