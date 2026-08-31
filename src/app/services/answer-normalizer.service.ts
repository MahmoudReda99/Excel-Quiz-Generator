import { Injectable } from '@angular/core';
import { QuizChoice } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class AnswerNormalizerService {
  normalizeAnswer(rawAnswer: any, choices: QuizChoice[]): string | string[] {
    if (rawAnswer === null || rawAnswer === undefined) return '';
    
    const strAnswer = String(rawAnswer).trim();
    if (!strAnswer) return '';
    
    if (strAnswer.includes(',')) {
      return strAnswer.split(',').map(a => this.matchSingleAnswer(a.trim(), choices)).filter(Boolean);
    }
    
    if (strAnswer.includes(';') || strAnswer.includes('و')) {
      const sep = strAnswer.includes(';') ? ';' : 'و';
      return strAnswer.split(sep).map(a => this.matchSingleAnswer(a.trim(), choices)).filter(Boolean);
    }

    return this.matchSingleAnswer(strAnswer, choices);
  }

  private matchSingleAnswer(answer: string, choices: QuizChoice[]): string {
    const str = String(answer).trim();
    if (!str) return '';

    // If single letter A-H
    if (/^[A-H]$/i.test(str)) {
      return str.toUpperCase();
    }

    // Arabic letter mapping: أ / ا -> A, ب -> B, ج -> C, د -> D, هـ / ه -> E
    const arabicLetterMap: Record<string, string> = {
      'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
    };
    if (arabicLetterMap[str]) {
      return arabicLetterMap[str];
    }

    // Number 1-8 (e.g. 1 -> A, 2 -> B, 3 -> C, 4 -> D)
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) {
      const label = String.fromCharCode(64 + num); // 1 -> A, 2 -> B...
      // Check if choice exists with this label or index
      const matched = choices.find(c => c.label === label || c.id === label);
      if (matched) return matched.id;
      if (choices[num - 1]) return choices[num - 1].id;
      return label;
    }

    // "Option 1", "Option A", "الخيار 1", "الإجابة الأول", etc.
    const optionMatch = str.match(/(?:option|choice|الخيار|الاختيار|الإجابة)\s*([a-h1-8]|أ|ب|ج|د)/i);
    if (optionMatch) {
      const val = optionMatch[1];
      if (/^[a-h]$/i.test(val)) return val.toUpperCase();
      const n = parseInt(val, 10);
      if (!isNaN(n) && choices[n - 1]) return choices[n - 1].id;
      if (arabicLetterMap[val]) return arabicLetterMap[val];
    }

    // Try matching exact choice text (case-insensitive)
    const matchedChoice = choices.find(c => c.text.toLowerCase().trim() === str.toLowerCase());
    if (matchedChoice) {
      return matchedChoice.id;
    }

    // Fallback: return trimmed string capitalized if single letter or as-is
    return str;
  }

  isCorrect(userAnswer: string | string[] | null, correctAnswer: string | string[], type: 'single' | 'multiple'): boolean {
    if (userAnswer === null || userAnswer === undefined) return false;

    if (type === 'single') {
      if (Array.isArray(userAnswer)) {
        return userAnswer.length === 1 && userAnswer[0] === correctAnswer;
      }
      if (Array.isArray(correctAnswer)) {
        return correctAnswer.includes(userAnswer);
      }
      return String(userAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();
    }

    // Multiple choice comparison
    const uArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    const cArr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

    if (uArr.length !== cArr.length) return false;

    const normU = uArr.map(x => String(x).trim().toUpperCase()).sort();
    const normC = cArr.map(x => String(x).trim().toUpperCase()).sort();

    return normU.every((val, index) => val === normC[index]);
  }
}
