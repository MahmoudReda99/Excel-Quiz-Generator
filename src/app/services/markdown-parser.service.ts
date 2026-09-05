import { Injectable } from '@angular/core';
import { QuizQuestion, QuizChoice } from '../models/quiz.model';
import { ExcelData, SheetInfo } from '../models/excel.model';

@Injectable({
  providedIn: 'root'
})
export class MarkdownParserService {

  readMarkdownFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  parseMarkdownToQuestions(markdownText: string): QuizQuestion[] {
    if (!markdownText) return [];

    const questions: QuizQuestion[] = [];
    const lines = markdownText.split(/\r?\n/);
    
    let currentQText = '';
    let currentChoices: QuizChoice[] = [];
    let currentCorrectAnswers: string[] = [];
    let currentExplanation: string | null = null;
    let optionIndex = 0;

    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    const isFooterOrExaminerText = (text: string): boolean => {
      const norm = text.toLowerCase().trim();
      const footerKeywords = [
        'إعداد', 'اعداد', 'إشراف', 'اشراف', 'رئيس اللجنة', 'اعضاء اللجنة', 'أعضاء اللجنة',
        'توقيع', 'عضو اللجنة', 'الممتحن', 'المراجع', 'اللجنة الامتحانية', 'لجنة الاختبار',
        'مع تمنياتنا', 'انتهت الأسئلة', 'انتهت الاسئلة', 'تم بحمد الله', 'النتيجة النهائية',
        'ملاحظات', 'اسم المراجع', 'رقم البند', 'رقم الصفحة', 'اسم المرجع', 'رئيس قاطع', 'مشرف الدور', 'قائد المركز',
        'examiner', 'signature', 'prepared by', 'approved by', 'committee'
      ];
      if (footerKeywords.some(kw => norm.startsWith(kw) || (norm.length < 80 && norm.includes(kw)))) {
        return true;
      }
      const militaryRankRegex = /(?:^|\s)(?:عميد|عقيد|مقدم|رائد|نقيب|ملازم|لواء|فريق|مشير)(?:\s+أ\s*\.?\s*ح)?\s*[\/\s]/i;
      return militaryRankRegex.test(norm);
    };

    const saveCurrentQuestion = () => {
      if (currentQText.trim() && currentChoices.length > 0 && !isFooterOrExaminerText(currentQText)) {
        const type: 'single' | 'multiple' = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
        const finalCorrect = currentCorrectAnswers.length === 1 
          ? currentCorrectAnswers[0] 
          : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (currentChoices[0]?.id || 'A'));

        questions.push({
          id: `md_q_${questions.length + 1}`,
          text: currentQText.trim(),
          choices: [...currentChoices],
          correctAnswer: finalCorrect,
          type,
          explanation: currentExplanation ? currentExplanation.trim() : null,
          difficulty: null,
          userAnswer: null
        });
      }
      currentQText = '';
      currentChoices = [];
      currentCorrectAnswers = [];
      currentExplanation = null;
      optionIndex = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for Question Header: # 1. , ## Question 1: , 1. , س1: , Q1:
      const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|س\s*\d+[:\.\-]\s*|Q\d+[:\.\-]\s*|Question\s*\d+[:\.\-]\s*)(.+)$/i);
      
      // Check for Answer key line: Answer: A,C or الإجابة: أ،ج or Correct: B
      const answerKeyMatch = line.match(/^(?:Answer|Correct Answer|Correct|الإجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

      // Check for Explanation line: > Explanation text or Explanation: text or الشرح: text
      const expMatch = line.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير)[:\s]+)(.+)$/i);

      if (qHeaderMatch && !line.startsWith('- [') && !line.match(/^[A-H][\.\)]/i)) {
        saveCurrentQuestion();
        currentQText = qHeaderMatch[1].trim();
      } else if (answerKeyMatch) {
        const rawAns = answerKeyMatch[1].trim();
        const parts = rawAns.split(/[,;\s\u060C]+/);
        parts.forEach(p => {
          const cleanP = p.trim().toUpperCase();
          if (cleanP) {
            currentCorrectAnswers.push(cleanP);
          }
        });
      } else if (expMatch) {
        currentExplanation = (currentExplanation ? currentExplanation + ' ' : '') + expMatch[1].trim();
      } else if (line.startsWith('- [') || line.match(/^(?:[\-\*\+]\s*)?(?:[A-Ha-hأ-ي1-8][\.\)\:])\s+/)) {
        let isChecked = false;
        let isStarred = false;
        let label = labels[optionIndex] || `O${optionIndex}`;
        let choiceText = line;

        // Checkbox [- [x] text]
        const cbMatch = line.match(/^[\-\*\+]\s*\[([ xX])\]\s*(?:([A-Ha-hأ-ي1-8])[\.\)\:]\s*)?(.+)$/);
        if (cbMatch) {
          isChecked = cbMatch[1].toLowerCase() === 'x';
          if (cbMatch[2]) label = cbMatch[2].toUpperCase();
          choiceText = cbMatch[3].trim();
        } else {
          // Standard choice A) text or A. text *
          const stdMatch = line.match(/^(?:[\-\*\+]\s*)?(?:([A-Ha-hأ-ي1-8])[\.\)\:]\s*)?(.+?)(\s*\*+)?$/);
          if (stdMatch) {
            if (stdMatch[1]) label = stdMatch[1].toUpperCase();
            choiceText = stdMatch[2].trim();
            if (stdMatch[3]) isStarred = true;
          }
        }

        const choiceId = label.toUpperCase();
        currentChoices.push({
          id: choiceId,
          label: choiceId,
          text: choiceText
        });

        if (isChecked || isStarred) {
          currentCorrectAnswers.push(choiceId);
        }

        optionIndex++;
      } else if (currentQText && currentChoices.length === 0) {
        currentQText += ' ' + line;
      }
    }

    saveCurrentQuestion();
    return questions;
  }

  convertMarkdownToExcelData(fileName: string, fileSize: number, markdownText: string): ExcelData {
    const questions = this.parseMarkdownToQuestions(markdownText);
    
    const headers = ['مسلسل', 'نص السؤال', 'الإجابة الصحيحة', 'الخيار أ (A)', 'الخيار ب (B)', 'الخيار ج (C)', 'الخيار د (D)', 'الشرح'];
    const rows = questions.map((q, idx) => {
      const row: any[] = [];
      row[0] = idx + 1;
      row[1] = q.text;
      row[2] = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(';') : q.correctAnswer;
      row[3] = q.choices[0]?.text || '';
      row[4] = q.choices[1]?.text || '';
      row[5] = q.choices[2]?.text || '';
      row[6] = q.choices[3]?.text || '';
      row[7] = q.explanation || '';
      return row;
    });

    const sheet: SheetInfo = {
      name: fileName.replace(/\.(md|markdown)$/i, ''),
      index: 0,
      rowCount: rows.length,
      colCount: headers.length,
      headers,
      rows,
      fileName
    };

    return {
      fileName,
      fileSize,
      sheets: [sheet],
      selectedSheet: 0
    };
  }
}
