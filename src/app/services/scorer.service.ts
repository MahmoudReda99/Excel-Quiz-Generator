import { Injectable } from '@angular/core';
import { QuizQuestion, QuizResult } from '../models/quiz.model';
import { AnswerNormalizerService } from './answer-normalizer.service';

@Injectable({
  providedIn: 'root'
})
export class ScorerService {
  constructor(private normalizer: AnswerNormalizerService) {}

  calculateResult(questions: QuizQuestion[], startTime: Date, endTime: Date): QuizResult {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    questions.forEach(q => {
      if (q.userAnswer === null || q.userAnswer === undefined || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0)) {
        unansweredCount++;
      } else {
        const isCorrect = this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const timeUsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    return {
      totalQuestions,
      correctCount,
      wrongCount,
      unansweredCount,
      score: Math.round(score * 100) / 100,
      timeUsed,
      questions
    };
  }
}
