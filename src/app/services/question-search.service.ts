import { Injectable } from '@angular/core';
import { QuizQuestion } from '../models/quiz.model';
import { AnswerNormalizerService } from './answer-normalizer.service';

export interface SearchMatchResult {
  question: QuizQuestion;
  originalIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionSearchService {
  constructor(private normalizer: AnswerNormalizerService) {}

  /**
   * Normalizes Arabic and English text for resilient searching.
   * - Strips Tashkeel and Tatweel
   * - Unifies Alefs (أ, إ, آ, ٱ -> ا)
   * - Unifies Taa Marbuta and Haa (ة -> ه)
   * - Unifies Yaa and Alif Maksura (ى -> ي)
   * - Lowercases English letters
   * - Collapses whitespace
   */
  normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      // Remove Arabic Tashkeel / Harakat
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Remove Tatweel / Kashida
      .replace(/\u0640/g, '')
      // Normalize Hamzas and Alefs
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize Taa Marbuta
      .replace(/ة/g, 'ه')
      // Normalize Alif Maksura
      .replace(/ى/g, 'ي')
      // Normalize Persian/Urdu Kaf and Yeh if present
      .replace(/ك/g, 'ك')
      .replace(/ي/g, 'ي')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Checks if a question matches a search query across:
   * 1. Question text
   * 2. Question number (e.g. 5, #5, سؤال 5, Q5)
   * 3. Choices text
   * 4. Explanation text
   */
  matches(question: QuizQuestion, index: number, rawQuery: string): boolean {
    if (!rawQuery || !rawQuery.trim()) return true;

    const normQuery = this.normalizeText(rawQuery);
    if (!normQuery) return true;

    const queryWords = normQuery.split(' ').filter(w => w.length > 0);

    // Question number check (e.g. searching "5", "#5", "Q5", "سؤال 5", "س5")
    const qNum = (index + 1).toString();
    const qNumAliases = [
      qNum,
      `#${qNum}`,
      `q${qNum}`,
      `س${qNum}`,
      `سؤال ${qNum}`,
      `question ${qNum}`
    ];
    if (qNumAliases.some(alias => alias === normQuery || normQuery === qNum)) {
      return true;
    }

    // Build searchable combined string for this question
    let searchable = `${qNum} ${this.normalizeText(question.text)}`;

    if (question.choices && Array.isArray(question.choices)) {
      for (const choice of question.choices) {
        if (choice.text) {
          searchable += ` ${this.normalizeText(choice.text)}`;
        }
      }
    }

    if (question.explanation) {
      searchable += ` ${this.normalizeText(question.explanation)}`;
    }

    // All words in query must appear in the question (AND search)
    return queryWords.every(word => searchable.includes(word));
  }

  /**
   * Filters a list of questions with optional query and status filter.
   */
  filterQuestions(
    questions: QuizQuestion[],
    query: string,
    filter: 'all' | 'correct' | 'wrong' | 'unanswered' | 'pending' = 'all'
  ): SearchMatchResult[] {
    if (!questions || questions.length === 0) return [];

    const results: SearchMatchResult[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Status check
      if (filter !== 'all') {
        const isAnswered = q.type === 'multiple' 
          ? !!q.isSubmitted 
          : (q.userAnswer !== null && q.userAnswer !== undefined && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0));

        const isCorrect = isAnswered && this.normalizer.isCorrect(q.userAnswer, q.correctAnswer, q.type);
        const isWrong = isAnswered && !isCorrect;
        const isUnanswered = !isAnswered;
        const isPending = !!q.isPending;

        if (filter === 'correct' && !isCorrect) continue;
        if (filter === 'wrong' && !isWrong) continue;
        if (filter === 'unanswered' && !isUnanswered) continue;
        if (filter === 'pending' && !isPending) continue;
      }

      // Query check
      if (this.matches(q, i, query)) {
        results.push({ question: q, originalIndex: i });
      }
    }

    return results;
  }
}
