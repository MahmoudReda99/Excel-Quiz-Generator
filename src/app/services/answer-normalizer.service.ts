import { Injectable } from '@angular/core';
import { QuizChoice } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class AnswerNormalizerService {
  private arabicLetterMap: Record<string, string> = {
    'أ': 'A', 'ا': 'A', 'إ': 'A', 'آ': 'A', 'ٱ': 'A',
    'ب': 'B', 'ج': 'C', 'د': 'D',
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

  private cleanText(str: string): string {
    return String(str || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[؟?.,:;!\-_()[\]{}"'«»"“”\/\\*#~^%&+=><]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  toCanonicalId(val: any, choices?: QuizChoice[]): string {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    if (!str) return '';

    // Strip outer punctuation/brackets
    str = str.replace(/^[\(\[\{\<\«\'\"\s]+/, '').replace(/[\)\]\}\>\»\'\"\.\:\-\s]+$/, '').trim();

    const lower = str.toLowerCase();

    // True/False mappings
    if (['true', 'صح', 'صحيح', 'صواب', 'ص', 'yes', 'نعم', 't', 'v'].includes(lower) || lower.startsWith('صح ') || lower.startsWith('صحيح ')) {
      if (choices && choices.length > 0) {
        const choiceA = choices.find(c => c.id.toUpperCase() === 'A' || this.cleanText(c.text).includes('صح') || this.cleanText(c.text).includes('true'));
        if (choiceA) return choiceA.id.toUpperCase();
        return choices[0].id.toUpperCase();
      }
      return 'A';
    }

    if (['false', 'خطأ', 'خاطئ', 'خاطئة', 'خاطئه', 'غلط', 'خ', 'no', 'لا', 'f', 'x'].includes(lower) || lower.startsWith('خطأ ') || lower.startsWith('خاطئ ')) {
      if (choices && choices.length > 0) {
        const choiceB = choices.find(c => c.id.toUpperCase() === 'B' || this.cleanText(c.text).includes('خط') || this.cleanText(c.text).includes('false'));
        if (choiceB) return choiceB.id.toUpperCase();
        if (choices.length > 1) return choices[1].id.toUpperCase();
      }
      return 'B';
    }

    // Direct Letter A-H
    if (/^[A-H]$/i.test(str)) {
      return str.toUpperCase();
    }

    // Arabic letter & numeral mapping
    if (this.arabicLetterMap[str]) {
      const mappedLetter = this.arabicLetterMap[str];
      if (choices) {
        const matched = choices.find(c => c.label?.toUpperCase() === mappedLetter || c.id.toUpperCase() === mappedLetter);
        if (matched) return matched.id.toUpperCase();
      }
      return mappedLetter;
    }

    // Number 1-8 (e.g. 1 -> A, 2 -> B, 3 -> C, 4 -> D)
    const num = parseInt(str, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) {
      const label = String.fromCharCode(64 + num); // 1 -> A, 2 -> B...
      if (choices) {
        const matched = choices.find(c => c.label?.toUpperCase() === label || c.id.toUpperCase() === label);
        if (matched) return matched.id.toUpperCase();
        if (choices[num - 1]) return choices[num - 1].id.toUpperCase();
      }
      return label;
    }

    // Option 1, Option A, الخيار 1, الخيار أ, etc.
    const optionMatch = str.match(/(?:option|choice|الخيار|الاختيار|الإجابة|الاجابة|البديل)\s*([a-h1-8]|أ|إ|ا|ب|ج|د|هـ|ه|و|ز|ح)/i);
    if (optionMatch) {
      const valMatch = optionMatch[1];
      if (/^[a-h]$/i.test(valMatch)) return valMatch.toUpperCase();
      const n = parseInt(valMatch, 10);
      if (!isNaN(n)) {
        const lbl = String.fromCharCode(64 + n);
        if (choices && choices[n - 1]) return choices[n - 1].id.toUpperCase();
        return lbl;
      }
      if (this.arabicLetterMap[valMatch]) return this.arabicLetterMap[valMatch];
    }

    // Try matching exact or normalized choice text against available choices
    if (choices && choices.length > 0) {
      // 1. Exact text match
      const exactMatch = choices.find(c => c.text.trim().toLowerCase() === str.toLowerCase());
      if (exactMatch) return exactMatch.id.toUpperCase();

      // 2. Normalized clean text match
      const cleanedInput = this.cleanText(str);
      if (cleanedInput) {
        const cleanMatch = choices.find(c => this.cleanText(c.text) === cleanedInput);
        if (cleanMatch) return cleanMatch.id.toUpperCase();

        // 3. Substring inclusion if sufficiently long
        if (cleanedInput.length >= 4) {
          const subMatch = choices.find(c => {
            const ct = this.cleanText(c.text);
            return ct.includes(cleanedInput) || cleanedInput.includes(ct);
          });
          if (subMatch) return subMatch.id.toUpperCase();
        }
      }
    }

    return str.toUpperCase();
  }

  private matchSingleAnswer(answer: string, choices: QuizChoice[]): string {
    return this.toCanonicalId(answer, choices);
  }

  isCorrectChoice(choiceId: string, correctAnswer: string | string[] | null | undefined, choices?: QuizChoice[]): boolean {
    if (!correctAnswer) return false;
    const canChoiceId = this.toCanonicalId(choiceId, choices);

    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some(c => this.toCanonicalId(c, choices) === canChoiceId);
    }
    return this.toCanonicalId(correctAnswer, choices) === canChoiceId;
  }

  isUserSelectedChoice(choiceId: string, userAnswer: string | string[] | null | undefined, choices?: QuizChoice[]): boolean {
    if (!userAnswer) return false;
    const canChoiceId = this.toCanonicalId(choiceId, choices);

    if (Array.isArray(userAnswer)) {
      return userAnswer.some(u => this.toCanonicalId(u, choices) === canChoiceId);
    }
    return this.toCanonicalId(userAnswer, choices) === canChoiceId;
  }

  isCorrect(
    userAnswer: string | string[] | null | undefined,
    correctAnswer: string | string[] | null | undefined,
    type: 'single' | 'multiple',
    choices?: QuizChoice[]
  ): boolean {
    if (userAnswer === null || userAnswer === undefined) return false;
    if (correctAnswer === null || correctAnswer === undefined) return false;

    if (type === 'single') {
      const uVal = Array.isArray(userAnswer) ? (userAnswer[0] || '') : userAnswer;
      const canU = this.toCanonicalId(uVal, choices);

      if (Array.isArray(correctAnswer)) {
        return correctAnswer.some(c => this.toCanonicalId(c, choices) === canU);
      }
      return canU === this.toCanonicalId(correctAnswer, choices);
    }

    // Multiple choice comparison
    const uArr = (Array.isArray(userAnswer) ? userAnswer : [userAnswer])
      .map(x => this.toCanonicalId(x, choices))
      .filter(Boolean);
    const cArr = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer])
      .map(x => this.toCanonicalId(x, choices))
      .filter(Boolean);

    // Remove duplicates
    const uniqueU = Array.from(new Set(uArr)).sort();
    const uniqueC = Array.from(new Set(cArr)).sort();

    if (uniqueU.length !== uniqueC.length || uniqueU.length === 0) return false;

    return uniqueU.every((val, index) => val === uniqueC[index]);
  }
}
