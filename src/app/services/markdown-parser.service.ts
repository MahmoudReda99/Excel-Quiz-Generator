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
    let hasCurrentHeader = false;

    const arabicChoiceMap: { [key: string]: string } = {
      'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
      'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
    };

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

    const extractChoicesFromLine = (line: string): Array<{ label: string; text: string }> | null => {
      const choicePattern = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;
      const matches: Array<{ label: string; startIndex: number; matchLength: number }> = [];
      let match: RegExpExecArray | null;

      while ((match = choicePattern.exec(line)) !== null) {
        matches.push({
          label: match[1],
          startIndex: match.index,
          matchLength: match[0].length
        });
      }

      if (matches.length === 0) return null;

      const results: Array<{ label: string; text: string }> = [];
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const textStart = current.startIndex + current.matchLength;
        const textEnd = (i < matches.length - 1) ? matches[i + 1].startIndex : line.length;
        let choiceText = line.slice(textStart, textEnd).trim();
        choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();

        // Extract inline explanation if present
        if (choiceText.includes('المرجع')) {
          const expRegex = /(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/;
          const expMatch = choiceText.match(expRegex);
          if (expMatch) {
            choiceText = expMatch[1].replace(/[—\-\s]+$/, '').trim();
            const exp = expMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
            currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + exp;
          }
        }

        if (choiceText) {
          results.push({ label: current.label, text: choiceText });
        }
      }

      return results.length > 0 ? results : null;
    };

    const parseCorrectAnswer = (rawAns: string): string[] => {
      const cleanAns = rawAns.trim();
      if (/^(?:صح|صحيح|ص|true|yes|نعم)$/i.test(cleanAns)) return ['A'];
      if (/^(?:خطأ|خاطئ|خ|false|no|لا)$/i.test(cleanAns)) return ['B'];

      const letterMatch = cleanAns.match(/[\(\)]?\s*([A-Ha-hأ-ي1-8])\s*[\.\)\:\-\(]?/);
      if (letterMatch) {
        let label = letterMatch[1].toUpperCase();
        if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
        if (/^[A-H]$/.test(label)) return [label];
      }

      const answers: string[] = [];
      const parts = cleanAns.split(/[,;\s\u060C]+/);
      parts.forEach(p => {
        let cleanP = p.replace(/[\(\)\[\]]/g, '').trim().toUpperCase();
        if (arabicChoiceMap[cleanP]) cleanP = arabicChoiceMap[cleanP];
        if (/^[A-H]$/.test(cleanP)) answers.push(cleanP);
      });

      return answers.length > 0 ? answers : [rawAns];
    };

    const saveCurrentQuestion = () => {
      let qTextClean = currentQText.trim();
      if (!qTextClean) return;

      // Ignore intro/footer text that has no header AND no explicit choices
      if (!hasCurrentHeader && currentChoices.length === 0) {
        currentQText = '';
        return;
      }

      // Clean HTML comment tags if present
      qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
      // Remove leading # symbols or "#### السؤال 1" if qText starts with header
      qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*\s*/i, '').trim();

      if (qTextClean && !isFooterOrExaminerText(qTextClean)) {
        let choices = [...currentChoices];

        // If no explicit choices found, check if it's a True/False question or fallback
        if (choices.length === 0) {
          choices = [
            { id: 'A', label: 'A', text: 'صح / True' },
            { id: 'B', label: 'B', text: 'خطأ / False' }
          ];
        }

        const type: 'single' | 'multiple' = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
        const finalCorrect = currentCorrectAnswers.length === 1 
          ? currentCorrectAnswers[0] 
          : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (choices[0]?.id || 'A'));

        questions.push({
          id: `md_q_${questions.length + 1}`,
          text: qTextClean,
          choices,
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
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('<!--') && line.endsWith('-->')) continue;

      const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

      // Check for Question Header: #### السؤال 1 , 1. , س1: , Q1: , السؤال 1:
      const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i);
      const isHeader = !!qHeaderMatch && (
        line.startsWith('#') || 
        /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
        /^\d+[\.\-\)]/i.test(line)
      );
      
      // Check for Answer key line: **الإجابة:** A or Answer: A,C or الإجابة الصحيحة: أ( رئيس الأركان
      const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

      // Check for Explanation line: > Explanation text or Explanation: text or الشرح: text
      const expMatch = cleanLine.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير)[:\s]+)(.+)$/i);

      // Check for Choices line (can contain multiple choices on the same line)
      const extractedChoices = !answerKeyMatch ? extractChoicesFromLine(line) : null;

      if (isHeader && !extractedChoices && !answerKeyMatch) {
        saveCurrentQuestion();
        hasCurrentHeader = true;
        currentQText = qHeaderMatch ? qHeaderMatch[1].trim() : cleanLine.replace(/^#+\s*/, '').trim();
        currentChoices = [];
        currentCorrectAnswers = [];
        currentExplanation = null;
      } else if (answerKeyMatch) {
        const parsedAns = parseCorrectAnswer(answerKeyMatch[1]);
        currentCorrectAnswers.push(...parsedAns);
      } else if (expMatch) {
        currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + expMatch[1].trim();
      } else if (extractedChoices) {
        extractedChoices.forEach(c => {
          let label = c.label.toUpperCase();
          if (arabicChoiceMap[label]) {
            label = arabicChoiceMap[label];
          }
          const choiceId = label;

          // Prevent adding duplicate choices for the same question
          if (!currentChoices.some(ch => ch.id === choiceId)) {
            currentChoices.push({
              id: choiceId,
              label: choiceId,
              text: c.text
            });
          }

          if (line.includes('[x]') || line.includes('[X]')) {
            if (!currentCorrectAnswers.includes(choiceId)) {
              currentCorrectAnswers.push(choiceId);
            }
          }
        });
      } else if (!line.startsWith('#')) {
        const cleanContent = line.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
        if (cleanContent) {
          if (currentChoices.length > 0) {
            if (currentExplanation && (currentExplanation.includes('المرجع') || currentExplanation.includes('ص '))) {
              let cleanExpLine = cleanContent.replace(/[\)\(\]\[]\s*$/, '');
              currentExplanation += ' ' + cleanExpLine;
            } else {
              let lastChoice = currentChoices[currentChoices.length - 1];
              lastChoice.text += ' ' + cleanContent;
              
              const expRegex = /(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/;
              const expMatch = lastChoice.text.match(expRegex);
              if (expMatch) {
                lastChoice.text = expMatch[1].replace(/[—\-\s]+$/, '').trim();
                currentExplanation = expMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
              }
            }
          } else {
            currentQText = (currentQText ? currentQText + '\n' : '') + cleanContent;
          }
        }
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
