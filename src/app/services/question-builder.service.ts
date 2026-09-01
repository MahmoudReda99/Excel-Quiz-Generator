import { Injectable } from '@angular/core';
import { SheetInfo, ColumnMapping } from '../models/excel.model';
import { QuizQuestion, QuizChoice } from '../models/quiz.model';
import { AnswerNormalizerService } from './answer-normalizer.service';

@Injectable({
  providedIn: 'root'
})
export class QuestionBuilderService {
  constructor(private normalizer: AnswerNormalizerService) {}

  buildQuestions(sheet: SheetInfo, mapping: ColumnMapping): QuizQuestion[] {
    if (mapping.questionCol === null || mapping.correctAnswerCol === null) {
      return [];
    }

    const questions: QuizQuestion[] = [];
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    sheet.rows.forEach((row, rowIndex) => {
      const qText = row[mapping.questionCol!];
      if (!qText || String(qText).trim() === '') return;

      const rawAnswer = row[mapping.correctAnswerCol!];
      const explanation = mapping.explanationCol !== null ? row[mapping.explanationCol] : null;
      const difficulty = mapping.difficultyCol !== null ? Number(row[mapping.difficultyCol]) : null;

      let choices: QuizChoice[] = [];
      if (mapping.choiceCols.length > 0) {
        mapping.choiceCols.forEach((colIdx, i) => {
          const cText = row[colIdx];
          if (cText !== null && cText !== undefined && String(cText).trim() !== '') {
            choices.push({
              id: labels[i] || `O${i}`,
              label: labels[i] || `O${i}`,
              text: String(cText).trim()
            });
          }
        });
      }

      // True / False fallback if choices not explicitly listed in Excel option columns
      if (choices.length === 0) {
        choices = [
          { id: 'A', label: 'A', text: 'صح / True' },
          { id: 'B', label: 'B', text: 'خطأ / False' }
        ];
      }

      const normalizedAnswer = this.normalizer.normalizeAnswer(rawAnswer, choices);

      // Determine type: 'multiple' only if answer contains multiple selections (e.g. A,C)
      let type: 'single' | 'multiple' = 'single';
      if (Array.isArray(normalizedAnswer) && normalizedAnswer.length > 1) {
        type = 'multiple';
      } else if (String(rawAnswer || '').includes(',') || String(rawAnswer || '').includes(';')) {
        type = 'multiple';
      } else if (mapping.typeCol !== null) {
        const typeStr = String(row[mapping.typeCol] || '').toLowerCase();
        if (typeStr.includes('checkbox') || typeStr.includes('multiple select') || typeStr.includes('اختيار متعدد')) {
          type = 'multiple';
        }
      }

      questions.push({
        id: `q_${rowIndex}`,
        text: String(qText).trim(),
        choices,
        correctAnswer: normalizedAnswer,
        type,
        explanation: explanation ? String(explanation).trim() : null,
        difficulty: (difficulty !== null && !isNaN(difficulty)) ? difficulty : null,
        userAnswer: null
      });
    });

    return questions;
  }
}
