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

    // Pass 1: Detect explicit headers by priority
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

    // Cap auto-detected choice columns to 4 (A, B, C, D)
    if (mapping.choiceCols.length > 4) {
      mapping.choiceCols = mapping.choiceCols.slice(0, 4);
    }

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
    if (this.knownExcludes.some(ex => norm.includes(ex))) return false;
    if (['نوع الخيار', 'شرح الخيار', 'الخيارات', 'تأكيد الخيار', 'تأكيد الإجابة'].some(ex => norm.includes(ex))) return false;

    if (/^option\s+[a-h]/i.test(norm)) return true;
    if (/^choice\s+[a-h]/i.test(norm)) return true;
    if (/^الخيار\s*([أبجدa-h1-8]|الأول|الثاني|الثالث|الرابع)/i.test(norm)) return true;
    if (/^خيار\s*([أبجدa-h1-8]|الأول|الثاني|الثالث|الرابع)/i.test(norm)) return true;
    if (/^اختيار\s*([أبجدa-h1-8]|الأول|الثاني|الثالث|الرابع)/i.test(norm)) return true;
    if (/^option\s+[1-8]/i.test(norm) || /^choice\s+[1-8]/i.test(norm)) return true;
    if (/^[a-h]$/i.test(norm)) return true;
    if (['الخيار أ', 'الخيار ب', 'الخيار ج', 'الخيار د', 'خيار أ', 'خيار ب', 'خيار ج', 'خيار د', 'option a', 'option b', 'option c', 'option d', 'choice a', 'choice b', 'choice c', 'choice d', 'الاختيار الأول', 'الاختيار الثاني', 'الاختيار الثالث', 'الاختيار الرابع', 'الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'].some(p => norm.includes(p))) return true;
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
