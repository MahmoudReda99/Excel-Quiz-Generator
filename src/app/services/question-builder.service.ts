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
      const choicesText: string[] = [];
      if (mapping.choiceCols.length > 0) {
        mapping.choiceCols.forEach((colIdx, i) => {
          const cText = row[colIdx];
          if (cText !== null && cText !== undefined && String(cText).trim() !== '') {
            const trimmedChoice = String(cText).trim();
            explicitChoicesCount++;
            choicesText.push(trimmedChoice);
            choices.push({
              id: labels[i] || `O${i}`,
              label: labels[i] || `O${i}`,
              text: trimmedChoice
            });
          }
        });
      }

      // Check if this row is a footer, examiner signature, committee note, or non-question row
      if (this.isFooterOrExaminerRow(String(qText), rawAnswer, mapping.choiceCols.length > 0, explicitChoicesCount, choicesText)) {
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

      // 1. Initial type based on type column if mapped
      let type: 'single' | 'multiple' = 'single';

      if (mapping.typeCol !== null && row[mapping.typeCol] !== undefined && row[mapping.typeCol] !== null) {
        const typeStr = String(row[mapping.typeCol] || '').toLowerCase().trim();
        
        const multiAnswerKeywords = [
          'multiple answer', 'multiple answers', 'multi answer', 'multi select', 'checkbox',
          'متعدد الإجابات', 'متعدد الاجابات', 'إجابات متعددة', 'اجابات متعددة', 'أكثر من إجابة', 'خيارات متعددة'
        ];
        
        const singleChoiceKeywords = [
          'multiple choice', 'single choice', 'single', 'mcq',
          'اختيار من متعدد', 'الاختيار من متعدد', 'متعدد الاختيارات', 'اختيار واحد', 'إجابة واحدة', 'اجابة واحدة'
        ];

        if (multiAnswerKeywords.some(kw => typeStr.includes(kw))) {
          type = 'multiple';
        } else if (singleChoiceKeywords.some(kw => typeStr.includes(kw))) {
          type = 'single';
        }
      }

      // 2. SPECIAL OVERRIDE:
      // If the answer itself contains multiple selections (e.g. "A/B", "A,B", "أ و ب", or normalizedAnswer has length > 1),
      // it MUST ALWAYS be treated as 'multiple' answer, even if the row's type column says "اختيار من متعدد" or "multiple choice".
      const isMultiAnswerContent = (Array.isArray(normalizedAnswer) && normalizedAnswer.length > 1) ||
        (() => {
          if (rawAnswer === null || rawAnswer === undefined) return false;
          const rawStr = String(rawAnswer).trim();
          if (/[,;\u060C\u061B\/\+&]|\s+و\s+/.test(rawStr)) return true;
          const spaceParts = rawStr.split(/\s+/).filter(Boolean);
          return spaceParts.length > 1 && spaceParts.every(p => /^[A-Ha-h1-8]$/.test(p) || /^[أ-ي]$/.test(p));
        })();

      if (isMultiAnswerContent) {
        type = 'multiple';
      }

      // Ensure correctAnswer matches question type format
      let finalCorrectAnswer: string | string[] = normalizedAnswer;
      if (type === 'multiple') {
        if (Array.isArray(normalizedAnswer)) {
          finalCorrectAnswer = normalizedAnswer;
        } else if (normalizedAnswer) {
          finalCorrectAnswer = [normalizedAnswer];
        } else {
          finalCorrectAnswer = [];
        }
      } else {
        if (Array.isArray(normalizedAnswer)) {
          finalCorrectAnswer = normalizedAnswer[0] || '';
        }
      }

      questions.push({
        id: `q_${rowIndex}`,
        text: String(qText).trim(),
        choices,
        correctAnswer: finalCorrectAnswer,
        type,
        explanation: explanation ? String(explanation).trim() : null,
        difficulty: (difficulty !== null && !isNaN(difficulty)) ? difficulty : null,
        userAnswer: null
      });
    });

    return questions;
  }

  private isFooterOrExaminerRow(
    qText: string,
    rawAnswer: any,
    hasChoiceCols: boolean,
    explicitChoicesCount: number,
    choicesText: string[] = []
  ): boolean {
    const text = String(qText || '').trim();
    if (!text) return true;

    // Signature, Examiner, Committee, and Footer keywords
    const footerKeywords = [
      'إعداد', 'اعداد', 'إشراف', 'اشراف', 'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة',
      'توقيع', 'عضو اللجنة', 'الممتحن', 'المراجع', 'اللجنة الامتحانية', 'لجنة الاختبار',
      'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
      'ملاحظات', 'اسم المراجع', 'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز',
      'examiner', 'signature', 'prepared by', 'approved by', 'committee', 'page '
    ];

    const lowerText = text.toLowerCase();
    const isKeywordMatch = footerKeywords.some(kw => lowerText.startsWith(kw) || (lowerText.length < 80 && lowerText.includes(kw)));
    if (isKeywordMatch) {
      return true;
    }

    // Military Ranks signature pattern check (e.g. عميد أ ح /, مقدم /, رائد /, عقيد /, نقيب /, ملازم /, لواء /, فريق /)
    const militaryRankRegex = /(?:^|\s)(?:عميد|عقيد|مقدم|رائد|نقيب|ملازم|لواء|فريق|مشير)(?:\s+أ\s*\.?\s*ح)?\s*[\/\s]/i;
    if (militaryRankRegex.test(text)) {
      return true;
    }

    // Check if choices text contains military rank signatures
    const choicesCombined = choicesText.join(' ');
    if (choicesCombined && militaryRankRegex.test(choicesCombined) && (!rawAnswer || String(rawAnswer).trim() === '')) {
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
