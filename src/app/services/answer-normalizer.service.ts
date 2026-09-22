import { Injectable } from '@angular/core';
import { QuizChoice } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class AnswerNormalizerService {
  private arabicLetterMap: Record<string, string> = {
    'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
    'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H',
    '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H',
    '١': 'A', '٢': 'B', '٣': 'C', '٤': 'D', '٥': 'E', '٦': 'F', '٧': 'G', '٨': 'H'
  };

  normalizeAnswer(rawAnswer: any, choices: QuizChoice[]): string | string[] {
    if (rawAnswer === null || rawAnswer === undefined) return '';

    if (Array.isArray(rawAnswer)) {
      const mapped = rawAnswer.map(a => this.matchSingleAnswer(a, choices)).filter(Boolean);
      return mapped.length > 1 ? mapped : (mapped[0] || '');
    }

    const strAnswer = String(rawAnswer).trim();
    if (!strAnswer) return '';

    // If single answer is Choice 'و' (Choice F in Arabic), don't treat it as conjunction 'و'!
    if (strAnswer === 'و') {
      return this.matchSingleAnswer(strAnswer, choices);
    }

    // Check if strAnswer is a single choice label followed by descriptive text (e.g. "د( 2 ك مش ميكا + 1 ك بب" or "أ) رئيس الأركان")
    const singleOptionWithTextMatch = strAnswer.match(/^[\(\[]?\s*([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\]]?\s+(.+)$/);
    if (singleOptionWithTextMatch) {
      const labelCandidate = singleOptionWithTextMatch[1];
      const trailingText = singleOptionWithTextMatch[2].trim();
      const hasMoreMarkers = /(?:^|[,;\s\u060C\u061B\/\+&]+)[\(\[]?\s*([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\]]?(?=\s+|$)/.test(trailingText);
      if (!hasMoreMarkers) {
        return this.matchSingleAnswer(labelCandidate, choices);
      }
    }

    // Check if string contains multi-answer delimiters: comma, Arabic comma, semicolon, Arabic semicolon, slash, plus, '&', or ' و '
    const hasDelimiter = /[,;\u060C\u061B\/\+&]|\s+و\s+/.test(strAnswer);

    if (hasDelimiter) {
      const normalized = strAnswer
        .replace(/\s+و\s+/g, ',')
        .replace(/[,;\u060C\u061B\/\+&]+/g, ',');

      const parts = normalized.split(',').map(p => p.trim()).filter(Boolean);
      const mapped = parts.map(p => this.matchSingleAnswer(p, choices)).filter(Boolean);
      if (mapped.length > 1) {
        return mapped;
      }
      if (mapped.length === 1) {
        return mapped[0];
      }
    }

    // Check if string contains multiple space-separated letters (e.g. "A B" or "أ ب" or "A C D")
    const spaceParts = strAnswer.split(/\s+/).filter(Boolean);
    if (spaceParts.length > 1) {
      const allAreLabels = spaceParts.every(p => /^[A-Ha-h1-8]$/.test(p) || !!this.arabicLetterMap[p]);
      if (allAreLabels) {
        const mapped = spaceParts.map(p => this.matchSingleAnswer(p, choices)).filter(Boolean);
        if (mapped.length > 1) {
          return mapped;
        }
      }
    }

    return this.matchSingleAnswer(strAnswer, choices);
  }

  private matchSingleAnswer(answer: string, choices: QuizChoice[]): string {
    let str = String(answer).trim();
    if (!str) return '';

    // Strip wrapping parentheses, brackets, colons, or periods (e.g. "(A)", "[ب]", "أ.")
    str = str.replace(/^[\(\[\{]/, '').replace(/[\)\]\}\.\:\-]$/, '').trim();

    // True/False mappings:
    const lower = str.toLowerCase();
    if (['true', 'صح', 'صحيح', 'ص', 'yes', 'نعم'].includes(lower)) {
      const choiceA = choices.find(c => c.id === 'A');
      if (choiceA) return 'A';
    }
    if (['false', 'خطأ', 'خاطئ', 'خ', 'no', 'لا'].includes(lower)) {
      const choiceB = choices.find(c => c.id === 'B');
      if (choiceB) return 'B';
    }

    // If single letter A-H
    if (/^[A-H]$/i.test(str)) {
      return str.toUpperCase();
    }

    // Arabic letter & numeral mapping
    if (this.arabicLetterMap[str]) {
      const mappedLetter = this.arabicLetterMap[str];
      const matched = choices.find(c => c.label === mappedLetter || c.id === mappedLetter);
      if (matched) return matched.id;
      return mappedLetter;
    }

    // Number 1-8 (e.g. 1 -> A, 2 -> B, 3 -> C, 4 -> D)
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) {
      const label = String.fromCharCode(64 + num); // 1 -> A, 2 -> B...
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
      if (this.arabicLetterMap[val]) return this.arabicLetterMap[val];
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
