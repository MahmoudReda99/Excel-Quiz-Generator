import { Injectable } from '@angular/core';
import { SheetInfo, DetectionResult, ColumnMapping } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class ColumnDetectorService {
  private knownExcludes = [
    'serial no.', 'score', 'difficulty', 'sharing range',
    'label', 'materials and instructions', 'comprehensive questions',
    'المواد العامة', 'التعليمات', 'مطلوبة للأسئلة', 'شرح الإجابة', 'شرح',
    'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'qeustion type', 'question type',
    'نوع السؤال', 'النتيجة', 'نطاقات مشتركة'
  ];

  private cleanHeader(h: any): string {
    return String(h || '').toLowerCase().replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  detect(sheet: SheetInfo): DetectionResult {
    const mapping: ColumnMapping = {
      questionCol: null,
      choiceCols: [],
      correctAnswerCol: null,
      typeCol: null,
      explanationCol: null,
      difficultyCol: null
    };

    const headers = sheet.headers;

    // Pass 1: Detect explicit metadata/answer/type/explanation headers
    headers.forEach((h, index) => {
      if (!h) return;
      
      if (this.isAnswerHeader(h) && mapping.correctAnswerCol === null) {
        mapping.correctAnswerCol = index;
      } else if (this.isQuestionHeader(h) && mapping.questionCol === null) {
        mapping.questionCol = index;
      } else if (this.isTypeHeader(h) && mapping.typeCol === null) {
        mapping.typeCol = index;
      } else if (this.isExplanationHeader(h) && mapping.explanationCol === null) {
        mapping.explanationCol = index;
      } else if (this.isChoiceHeader(h)) {
        mapping.choiceCols.push(index);
      } else if (this.isDifficultyHeader(h) && mapping.difficultyCol === null) {
        mapping.difficultyCol = index;
      }
    });

    // Pass 2: Fallback detection for Question column if header is dynamic/title-based
    if (mapping.questionCol === null) {
      headers.forEach((h, index) => {
        if (!h || mapping.questionCol !== null) return;
        if (index === mapping.typeCol || index === mapping.explanationCol || 
            index === mapping.correctAnswerCol || mapping.choiceCols.includes(index) ||
            index === mapping.difficultyCol) {
          return;
        }

        const norm = this.cleanHeader(h);
        if (this.knownExcludes.some(ex => norm.includes(ex))) {
          return;
        }

        mapping.questionCol = index;
      });
    }

    // Pass 3: Fallback for Choice columns if choice columns don't have explicit headers
    if (mapping.choiceCols.length === 0 && sheet.rows.length > 0) {
      const maxCols = Math.max(...sheet.rows.map(r => r.length));
      for (let c = 0; c < maxCols; c++) {
        if (c === mapping.questionCol || c === mapping.correctAnswerCol || 
            c === mapping.typeCol || c === mapping.explanationCol || 
            c === mapping.difficultyCol) {
          continue;
        }
        const norm = this.cleanHeader(headers[c] || '');
        if (this.knownExcludes.some(ex => norm.includes(ex))) {
          continue;
        }
        // Check if data rows have non-empty text in this column
        const hasData = sheet.rows.some(r => r && r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== '');
        if (hasData) {
          mapping.choiceCols.push(c);
        }
      }
    }

    const hasQuestion = mapping.questionCol !== null;
    const hasAnswer = mapping.correctAnswerCol !== null;

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (hasQuestion && hasAnswer) {
      confidence = 'high';
    } else if (hasQuestion) {
      confidence = 'medium';
    }

    const warnings: string[] = [];
    if (!hasQuestion) warnings.push('Question column not detected.');
    if (!hasAnswer) warnings.push('Correct answer column not detected.');

    return { mapping, confidence, warnings };
  }

  private isQuestionHeader(h: string): boolean {
    const norm = this.cleanHeader(h);
    if (this.knownExcludes.some(ex => norm.includes(ex))) return false;
    const matches = [
      'question', 'questions', 'q.', 'q_text', 'qtitle', 'question text', 'question body',
      'السؤال', 'سؤال', 'نص السؤال', 'أسئلة', 'الأسئلة', 'الجذعية', 'جذعية', 'سؤال تعليمي', 'مضمون السؤال'
    ];
    return matches.some(p => norm === p || norm.includes(p));
  }

  private isChoiceHeader(h: string): boolean {
    const norm = this.cleanHeader(h);
    if (/^option\s+[a-z0-9]+$/i.test(norm)) return true;
    if (/^choice\s+[a-z0-9]+$/i.test(norm)) return true;
    if (/^خيار\s+[أ-يa-z0-9]+$/i.test(norm) || /^الخيار\s+[أ-يa-z0-9]+$/i.test(norm)) return true;
    if (norm.includes('الاختيار') || norm.includes('الخيار')) return true;
    if (/^[a-h]$/i.test(norm)) return true;
    return false;
  }

  private isAnswerHeader(h: string): boolean {
    const norm = this.cleanHeader(h);
    if (this.knownExcludes.some(ex => norm.includes(ex))) return false;
    return [
      'correct answer', 'answer', 'correct', 'solution',
      'الإجابة الصحيحة', 'الحل', 'الإجابة', 'إجابة', 'الجواب', 'اجابة'
    ].some(p => norm === p || norm.includes(p));
  }

  private isTypeHeader(h: string): boolean {
    const norm = this.cleanHeader(h);
    return ['qeustion type', 'question type', 'type', 'النوع', 'نوع السؤال'].some(p => norm.includes(p));
  }

  private isExplanationHeader(h: string): boolean {
    const norm = this.cleanHeader(h);
    return ['explanation', 'شرح', 'التفسير', 'الشرح'].some(p => norm.includes(p));
  }

  private isDifficultyHeader(h: string): boolean {
    const norm = this.cleanHeader(h);
    return norm.includes('difficulty') || norm.includes('صعوبة') || norm.includes('مستوى الصعوبة');
  }
}
