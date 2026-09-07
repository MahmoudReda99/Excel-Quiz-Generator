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

    const saveCurrentQuestion = () => {
      let qTextClean = currentQText.trim();
      if (!qTextClean) return;

      // Clean HTML comment tags if present
      qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
      // Remove leading # symbols or "#### السؤال 1" if qText starts with header
      qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*/i, '').trim();

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
      optionIndex = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Ignore HTML comments like <!-- converted from ... -->
      if (line.startsWith('<!--') && line.endsWith('-->')) continue;

      // Clean line without bold asterisks/underscores for pattern testing
      const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

      // Check for Question Header: #### السؤال 1 , 1. , س1: , Q1: , السؤال 1:
      const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[:\.\-]?\s*)(.*)$/i);
      const isHeader = !!qHeaderMatch && (
        line.startsWith('#') || 
        /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
        /^\d+[\.\-\)]/i.test(line)
      );
      
      // Check for Answer key line: **الإجابة:** A or Answer: A,C or الإجابة: صح
      const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);

      // Check for Explanation line: > Explanation text or Explanation: text or الشرح: text
      const expMatch = cleanLine.match(/^(?:>\s*|(?:Explanation|الشرح|التفسير)[:\s]+)(.+)$/i);

      // Enhanced Choice matching to support [ الإجابة الصحيحة ] marker even with no spaces
      let isCorrectChoice = false;
      let cleanLineForChoice = line;
      let lineNoSpaces = cleanLineForChoice.replace(/\s+/g, '');

      if (lineNoSpaces.includes('الإجابةالصحيحة') || lineNoSpaces.includes('اإلجابةالصحيحة')) {
        isCorrectChoice = true;
        // Remove the marker, being resilient to missing spaces and flipped brackets
        cleanLineForChoice = cleanLineForChoice.replace(/^[^()]*?(الإجابة|اإلجابة)[^()]*?(الصحيحة|لصحيحة)[^()]*?[\]\[]/g, '').trim();
        cleanLineForChoice = cleanLineForChoice.replace(/^[-—\s\[\]]+/, '').trim();
      } else if (cleanLineForChoice.match(/\[[xX]\]/)) {
        isCorrectChoice = true;
      }
      
      cleanLineForChoice = cleanLineForChoice.replace(/^[-—]\s*/, '').trim();

      // Check for Choice line: - (أ) text or - A. text or (أ) text or )أ( text
      const choiceMatch = cleanLineForChoice.match(/^(?:\[[ xX]\]\s*)?(?:\*\*|\b)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?(?:\*\*|\b)?\s*(.+)$/);

      if (isHeader && !choiceMatch && !answerKeyMatch) {
        saveCurrentQuestion();
        if (qHeaderMatch && qHeaderMatch[1]) {
          const bodyPart = qHeaderMatch[1].trim();
          if (bodyPart) {
            currentQText = bodyPart;
          }
        }
      } else if (answerKeyMatch) {
        const rawAns = answerKeyMatch[1].trim();
        if (rawAns === 'صح' || rawAns.toLowerCase() === 'true' || rawAns === 'نعم') {
          currentCorrectAnswers.push('A');
        } else if (rawAns === 'خطأ' || rawAns.toLowerCase() === 'false' || rawAns === 'لا') {
          currentCorrectAnswers.push('B');
        } else {
          const parts = rawAns.split(/[,;\s\u060C]+/);
          parts.forEach(p => {
            let cleanP = p.trim().toUpperCase();
            if (arabicChoiceMap[cleanP]) {
              cleanP = arabicChoiceMap[cleanP];
            }
            if (cleanP) {
              currentCorrectAnswers.push(cleanP);
            }
          });
        }
      } else if (expMatch) {
        currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + expMatch[1].trim();
      } else if (choiceMatch) {
        let label = choiceMatch[1].toUpperCase();
        if (arabicChoiceMap[label]) {
          label = arabicChoiceMap[label];
        }
        let choiceText = choiceMatch[2].replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').trim();
        // Clean up trailing dashes
        choiceText = choiceText.replace(/[—\-\s]+$/, '');

        // Extract explanation if present at the end of the choice (e.g. from PDF: (المرجع، ص 333))
        if (isCorrectChoice || choiceText.includes('المرجع')) {
          const explanationMatch = choiceText.match(/(.*?)\s*[\(\)\[\]]\s*(.*?(?:المرجع|ص\s*\d+|بند|صفحة).*?)[\(\)\[\]]?\s*$/);
          if (explanationMatch) {
            choiceText = explanationMatch[1].replace(/[—\-\s]+$/, '').trim();
            const exp = explanationMatch[2].replace(/[\)\(\]\[]\s*$/, '').trim();
            currentExplanation = (currentExplanation ? currentExplanation + '\n' : '') + exp;
          }
        }

        let isChecked = isCorrectChoice;
        if (line.includes('[x]') || line.includes('[X]')) {
          isChecked = true;
        }

        const choiceId = label;
        currentChoices.push({
          id: choiceId,
          label: choiceId,
          text: choiceText
        });

        if (isChecked) {
          currentCorrectAnswers.push(choiceId);
        }

        optionIndex++;
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
