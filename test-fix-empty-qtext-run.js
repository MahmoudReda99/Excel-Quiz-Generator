const snippet = `
ي ف ة ب غ ر ل ا ة ز ي ر غ ) أ ( ي ض ر ع ت ل ا ل م ع ل ا ) ب ( ل ي خ ت ل ا ى ل ع ة ر د ق ل ا ) ج ( ي ط م ن ل ا م د ع و
أق رجل ا ) د ة ي ط م ن ل ا م د ع و أةرجل ا ) د : ةحيحصلا باجلاإ ون اعتلا دئابملا ل يئارسإ
ق يدقت ب ولمسأ نم : 14 الؤسلا ت اعورشمل ا ي ف ةكرتشملا ت ابيردتلا اعرجإ ) أ
ةزكرملا ةئجافمل ا يوجلا ةبرضل ا ) ب ةيعادخل ا ةيسايسلا ت احيرصتل ا ) ج ةهبجل ا
لوط ىلع ت ارغثلا حتف ) د ت اعورشمل ا ي ف ةكرتشملا ت ابيردتلا اعرجإ ) أ :ةحيحصلا
ة باجلاإ ) ة نايصل ا - ل قنلا ( ىلإ ل اتقلا ل ئاسو وت ادعم ي ف ةرشابم ل ئاسولا
مسقنت : 15 الؤسلا حص ) أ أطخ ) ب :ةحيحصلا باجلاإ ىرجري يجيتارتسلا
علاطتسإلا : 16 الؤسلا طقف برحلا ن مز يف ) أ ( طقف ملسلا ن مز يف ) ب برحلوا
ملسلا ي ف ت اقوألا عيمج ي ف ) ج طقف ت امزلأا ن مز ي ف ) د برحلوا ملسلا ي ف
ت اقوألا عيمج ي ف ) ج :ةحيحصلا باجلاإ اتوقلا علاطتسإ ق رط نم س يل صحفلا :
17 الؤسلا حص ) أ أطخ ) ب :ةحيحصلا باجلاإ مهسوفن ي ف سأيلاو
طابحإلا ث بـل برعلا ىدل اهقوفت ةركف خ يسرت ىلإ ل يئارسإ أـجلت : 18 الؤسلا حص ) أ
أطخ ) ب حص ) أ :ةحيحصلا باجلاإ ةيطغت قاطن ي ف ) ودودحم ةرتفل ل يطعت ( ..........
رصانع دجاوتت : 19 الؤسلا راذنإلا ) أ ة يصصختلا ) ب ل يطعتلوا ) ج ة يدارلا ) د
ل يطعتلوا ) ج :ةحيحصلا باجلاإ وه ةيطغتلا قاطن نم ض رغلا : 20 الؤسلا وعدلل
جرحلا ن اكملاو ت قولا ي ف حتفلاو دشحلا ) أ ةيموجه ل امعأ ذيفنت ي ف وعدلا ءدبو
برحلا ءدب ) ب ةئجافملا وعدلا ت ابرض نم ةعفادمل ا ت وقلا ن يماّت ) ج دقاضملا
ت ابرضل ا / ت امجهلاب ةمجاهمل ا ت وقلا ريمدتو دص ) د ةئجافملا وعدلا ت ابرض نم
`;

function normalizeInputText(text) {
  if (!text) return '';
  let clean = text.replace(/\u0640/g, '');

  // 1. If Answer Key is preceded by trailing answer label (e.g. ") د : ةحيحصلا باجلاإ" or "حص ) أ :ةحيحصلا باجلاإ")
  // capture the label so we can use it!
  // Replace ": ةحيحصلا باجلاإ" or ":ةحيحصلا باجلاإ" with standard newline Answer Key
  clean = clean.replace(/([\(\)]?\s*[أبجدa-h1-8]\s*[\(\)]?|حص\s*[\(\)]?\s*[أA]\s*[\(\)]?|أطخ\s*[\(\)]?\s*[بB]\s*[\(\)]?)\s*[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: $1\n');
  clean = clean.replace(/[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi, '\nالإجابة الصحيحة: ');

  // 2. Question Header normalization (handles reversed 'الؤسلا' / 'لؤسملا' / 'السؤال')
  const headerRegex = /(?:[:\s]+(\d+)\s*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)|(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)\s*[:\s]*(\d+))/gi;
  clean = clean.replace(headerRegex, (m, p1, p2) => '\n\n#### السؤال ' + (p1 || p2) + ' :\n');

  return clean;
}

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

function extractChoicesFromLine(line) {
  if (!line || !line.trim()) return null;
  const cleanLine = line.trim();

  // 1. Trailing labels: [Text] ) أ or [Text] (أ)
  const trailingMarkerRegex = /(?:^|[\s،\.\-])[\(\)]\s*([أبجدa-h1-8])(?:\s*[\(\)])?(?=\s+|$)/g;
  const trailingMarkers = [];
  let tMatch;
  while ((tMatch = trailingMarkerRegex.exec(cleanLine)) !== null) {
    trailingMarkers.push({
      label: tMatch[1],
      startIndex: tMatch.index,
      endIndex: tMatch.index + tMatch[0].length
    });
  }

  if (trailingMarkers.length > 0 && trailingMarkers[0].startIndex >= 2) {
    const choices = [];
    let lastEnd = 0;
    for (let i = 0; i < trailingMarkers.length; i++) {
      const m = trailingMarkers[i];
      let choiceText = cleanLine.slice(lastEnd, m.startIndex).trim();
      choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
      if (choiceText === 'حص') choiceText = 'صح';
      if (choiceText === 'أطخ') choiceText = 'خطأ';
      if (choiceText) {
        choices.push({
          label: m.label,
          text: choiceText
        });
      }
      lastEnd = m.endIndex;
    }
    if (choices.length > 0) return choices;
  }

  // 2. Leading labels: (أ) [Text] or أ( [Text] or A. [Text]
  const leadingPattern = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;
  const leadingMarkers = [];
  let lMatch;
  while ((lMatch = leadingPattern.exec(cleanLine)) !== null) {
    leadingMarkers.push({
      label: lMatch[1],
      startIndex: lMatch.index,
      matchLength: lMatch[0].length
    });
  }

  if (leadingMarkers.length > 0) {
    const choices = [];
    for (let i = 0; i < leadingMarkers.length; i++) {
      const current = leadingMarkers[i];
      const textStart = current.startIndex + current.matchLength;
      const textEnd = (i < leadingMarkers.length - 1) ? leadingMarkers[i + 1].startIndex : cleanLine.length;
      let choiceText = cleanLine.slice(textStart, textEnd).trim();
      choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();
      if (choiceText === 'حص') choiceText = 'صح';
      if (choiceText === 'أطخ') choiceText = 'خطأ';
      if (choiceText) {
        choices.push({
          label: current.label,
          text: choiceText
        });
      }
    }
    if (choices.length > 0) return choices;
  }

  return null;
}

function parseCorrectAnswer(rawAns) {
  const cleanAns = rawAns.trim();
  if (/^(?:صح|صحيح|ص|حص|true|yes|نعم)$/i.test(cleanAns)) return ['A'];
  if (/^(?:خطأ|خاطئ|خ|أطخ|false|no|لا)$/i.test(cleanAns)) return ['B'];

  const letterMatch = cleanAns.match(/[\(\)]?\s*([A-Ha-hأ-ي1-8])\s*[\.\)\:\-\(]?/);
  if (letterMatch) {
    let label = letterMatch[1].toUpperCase();
    if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
    if (/^[A-H]$/.test(label)) return [label];
  }

  const answers = [];
  const parts = cleanAns.split(/[,;\s\u060C]+/);
  parts.forEach(p => {
    let cleanP = p.replace(/[\(\)\[\]]/g, '').trim().toUpperCase();
    if (arabicChoiceMap[cleanP]) cleanP = arabicChoiceMap[cleanP];
    if (/^[A-H]$/.test(cleanP)) answers.push(cleanP);
  });

  return answers.length > 0 ? answers : [rawAns];
}

function parseMarkdownToQuestions(markdownText) {
  if (!markdownText) return [];

  const text = normalizeInputText(markdownText);
  const questions = [];
  const lines = text.split(/\r?\n/);

  let currentQText = '';
  let currentChoices = [];
  let currentCorrectAnswers = [];
  let currentExplanation = null;
  let hasCurrentHeader = false; let currentHeaderTitle = "";

  const saveCurrentQuestion = () => {
    let qTextClean = currentQText.trim();
    if (!qTextClean) return;

    if (!hasCurrentHeader && currentChoices.length === 0) {
      currentQText = '';
      return;
    }

    qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
    qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*\s*/i, '').trim();

    if (!qTextClean && (currentChoices.length > 0 || hasCurrentHeader)) {
      qTextClean = currentHeaderTitle || `السؤال ${questions.length + 1}`;
   }
   if (qTextClean) {
      let choices = [...currentChoices];
      if (choices.length === 0) {
        choices = [
          { id: 'A', label: 'A', text: 'صح / True' },
          { id: 'B', label: 'B', text: 'خطأ / False' }
        ];
      }

      const type = currentCorrectAnswers.length > 1 ? 'multiple' : 'single';
      const finalCorrect = currentCorrectAnswers.length === 1 
        ? currentCorrectAnswers[0] 
        : (currentCorrectAnswers.length > 1 ? currentCorrectAnswers : (choices[0]?.id || 'A'));

      questions.push({
        id: `md_q_${questions.length + 1}`,
        text: qTextClean,
        choices,
        correctAnswer: finalCorrect,
        type,
        explanation: currentExplanation ? currentExplanation.trim() : null
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

    const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i);
    const isHeader = !!qHeaderMatch && (
      line.startsWith('#') || 
      /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
      /^\d+[\.\-\)]/i.test(line)
    );

    const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);
    const extractedChoices = !answerKeyMatch ? extractChoicesFromLine(line) : null;

    if (isHeader) {
      saveCurrentQuestion();
      hasCurrentHeader = true;
      currentHeaderTitle = qHeaderMatch[0].replace(/^#+\s*/, "").trim(); currentQText = qHeaderMatch[1].trim();
      currentChoices = [];
      currentCorrectAnswers = [];
      currentExplanation = null;
    } else if (answerKeyMatch) {
      const parsedAns = parseCorrectAnswer(answerKeyMatch[1]);
      currentCorrectAnswers.push(...parsedAns);
    } else if (extractedChoices) {
      extractedChoices.forEach(c => {
        let label = c.label.toUpperCase();
        if (arabicChoiceMap[label]) {
          label = arabicChoiceMap[label];
        }
        const choiceId = label;

        if (!currentChoices.some(ch => ch.id === choiceId)) {
          currentChoices.push({
            id: choiceId,
            label: choiceId,
            text: c.text
          });
        }
      });
    } else if (!line.startsWith('#')) {
      if (currentChoices.length > 0) {
        let lastChoice = currentChoices[currentChoices.length - 1];
        lastChoice.text += ' ' + cleanLine;
      } else {
        currentQText = (currentQText ? currentQText + '\n' : '') + cleanLine;
      }
    }
  }

  saveCurrentQuestion();
  return questions;
}

const result = parseMarkdownToQuestions(snippet);
console.log("TOTAL QUESTIONS EXTRACTED:", result.length);
result.forEach((q, idx) => {
  console.log(`[${idx+1}] ID: ${q.id} | Correct: ${q.correctAnswer} | Choices (${q.choices.length}): ${q.choices.map(c => c.id + ': ' + c.text).join(' , ')}`);
});
