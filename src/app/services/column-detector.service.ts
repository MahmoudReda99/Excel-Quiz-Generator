import { Injectable } from '@angular/core';
import { SheetInfo, DetectionResult, ColumnMapping } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class ColumnDetectorService {
  private knownExcludes = [
    'serial no.', 'score', 'difficulty', 'sharing range',
    'label', 'materials and instructions', 'رقم البند', 'رقم الصفحة', 'اسم المرجع'
  ];

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

    headers.forEach((h, index) => {
      if (!h) return;
      
      if (this.isTypeHeader(h) && mapping.typeCol === null) {
        mapping.typeCol = index;
      } else if (this.isExplanationHeader(h) && mapping.explanationCol === null) {
        mapping.explanationCol = index;
      } else if (this.isAnswerHeader(h) && mapping.correctAnswerCol === null) {
        mapping.correctAnswerCol = index;
      } else if (this.isChoiceHeader(h)) {
        mapping.choiceCols.push(index);
      } else if (this.isDifficultyHeader(h) && mapping.difficultyCol === null) {
        mapping.difficultyCol = index;
      }
    });

    // Detect question column from remaining candidate columns
    headers.forEach((h, index) => {
      if (!h || mapping.questionCol !== null) return;
      if (index === mapping.typeCol || index === mapping.explanationCol || 
          index === mapping.correctAnswerCol || mapping.choiceCols.includes(index) ||
          index === mapping.difficultyCol) {
        return;
      }

      const norm = h.toLowerCase().trim().replace(/\*/g, '');
      if (this.knownExcludes.some(ex => norm.includes(ex))) {
        return;
      }

      mapping.questionCol = index;
    });

    // Fallback: if no question column found yet, check for explicit 'question' header
    if (mapping.questionCol === null) {
      headers.forEach((h, index) => {
        if (!h || mapping.questionCol !== null) return;
        const norm = h.toLowerCase().trim().replace(/\*/g, '');
        if (norm.includes('question') || norm.includes('سؤال') || norm.includes('السؤال')) {
          mapping.questionCol = index;
        }
      });
    }

    let confidence: 'high' | 'medium' | 'low' = 'low';
    const hasQuestion = mapping.questionCol !== null;
    const hasAnswer = mapping.correctAnswerCol !== null;
    const hasChoices = mapping.choiceCols.length > 0;

    if (hasQuestion && hasAnswer && hasChoices) {
      confidence = 'high';
    } else if (hasQuestion && hasAnswer) {
      confidence = 'medium';
    }

    const warnings: string[] = [];
    if (!hasQuestion) warnings.push('Question column not detected.');
    if (!hasAnswer) warnings.push('Correct answer column not detected.');
    if (!hasChoices) warnings.push('Choice columns not detected.');

    return { mapping, confidence, warnings };
  }

  private isChoiceHeader(h: string): boolean {
    const norm = h.toLowerCase().trim().replace(/\*/g, '');
    if (/^option\s+[a-z0-9]+$/i.test(norm)) return true;
    if (/^choice\s+[a-z0-9]+$/i.test(norm)) return true;
    if (/^إجابة\s+[0-9]+$/i.test(norm) || /^الإجابة\s+[0-9]+$/i.test(norm)) return true;
    if (norm.includes('الاختيار') || norm.includes('الخيار')) return true;
    if (/^[a-h]$/i.test(norm)) return true;
    return false;
  }

  private isAnswerHeader(h: string): boolean {
    const norm = h.toLowerCase().trim().replace(/\*/g, '');
    return ['correct answer', 'answer', 'correct', 'الإجابة الصحيحة', 'الحل', 'الإجابة'].includes(norm);
  }

  private isTypeHeader(h: string): boolean {
    const norm = h.toLowerCase().trim().replace(/\*/g, '');
    return ['qeustion type', 'question type', 'type', 'النوع'].some(p => norm.includes(p));
  }

  private isExplanationHeader(h: string): boolean {
    const norm = h.toLowerCase().trim().replace(/\*/g, '');
    return ['explanation', 'شرح', 'التفسير'].some(p => norm.includes(p));
  }

  private isDifficultyHeader(h: string): boolean {
    const norm = h.toLowerCase().trim().replace(/\*/g, '');
    return norm.includes('difficulty') || norm.includes('صعوبة');
  }
}
