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

      let explicitChoicesCount = 0;
      let choices: QuizChoice[] = [];
      if (mapping.choiceCols.length > 0) {
        mapping.choiceCols.forEach((colIdx, i) => {
          const cText = row[colIdx];
          if (cText !== null && cText !== undefined && String(cText).trim() !== '') {
            explicitChoicesCount++;
            choices.push({
              id: labels[i] || `O${i}`,
              label: labels[i] || `O${i}`,
              text: String(cText).trim()
            });
          }
        });
      }

      // Check if this row is a footer, examiner signature, committee note, or non-question row
      if (this.isFooterOrExaminerRow(String(qText), rawAnswer, mapping.choiceCols.length > 0, explicitChoicesCount)) {
        return; // Ignore and skip footer / signature rows
      }

      // True / False fallback if choices not explicitly listed in Excel option columns
      if (choices.length === 0) {
        choices = [
          { id: 'A', label: 'A', text: 'صح / True' },
          { id: 'B', label: 'B', text: 'خطأ / False' }
        ];
      }

      const normalizedAnswer = this.normalizer.normalizeAnswer(rawAnswer, choices);

      // Determine type: 'multiple' if answer contains multiple selections (e.g. A;C, A,B) or type column indicates multiple
      let type: 'single' | 'multiple' = 'single';
      if (Array.isArray(normalizedAnswer) && normalizedAnswer.length > 1) {
        type = 'multiple';
      } else if (String(rawAnswer || '').includes(',') || String(rawAnswer || '').includes(';') || String(rawAnswer || '').includes('و')) {
        type = 'multiple';
      } else if (mapping.typeCol !== null) {
        const typeStr = String(row[mapping.typeCol] || '').toLowerCase();
        if (typeStr.includes('checkbox') || typeStr.includes('multiple') || typeStr.includes('متعدد') || typeStr.includes('إجابات') || typeStr.includes('خيارات')) {
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

  private isFooterOrExaminerRow(qText: string, rawAnswer: any, hasChoiceCols: boolean, explicitChoicesCount: number): boolean {
    const text = String(qText || '').toLowerCase().trim();
    if (!text) return true;

    // Signature, Examiner, Committee, and Footer keywords
    const footerKeywords = [
      'إعداد', 'اعداد', 'إشراف', 'اشراف', 'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة',
      'توقيع', 'عضو اللجنة', 'الممتحن', 'المراجع', 'اللجنة الامتحانية', 'لجنة الاختبار',
      'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
      'ملاحظات', 'اسم المراجع', 'رقم البند', 'رقم الصفحة', 'اسم المرجع',
      'examiner', 'signature', 'prepared by', 'approved by', 'committee', 'page '
    ];

    const isKeywordMatch = footerKeywords.some(kw => text.startsWith(kw) || (text.length < 60 && text.includes(kw)));
    if (isKeywordMatch) {
      return true;
    }

    // If choice columns exist in mapping, but this row has 0 choice text AND no correct answer
    const hasAnswer = rawAnswer !== null && rawAnswer !== undefined && String(rawAnswer).trim() !== '';
    if (hasChoiceCols && explicitChoicesCount === 0 && !hasAnswer) {
      return true;
    }

    return false;
  }
}
