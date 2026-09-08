const screenshotText = `Q1. )ضباط( وعد و عـلاطتسـا : دقاملا مـرسـا 1 ذجومن : ذجومنلا مـسـا ىـلـعلأا ىوتسملل عـلاطتسإلا لـتاق تـاـمـيـلـعـتـو دئاقلا تـاـمـيـلـعـت ىـلـع ًاءاـنـب عـلاطتسإلا إدارةو مـيـظـنـت نـع رـشـاـبـمـلا لـؤـئـسـمـلا : 1 لـؤـسـمـلا ( أ (رـئـيـس الأركـاـن ( ب (دئاقلا ( ج (رـئـيـس الإسـتـطـالع ( أ :ةـحـيـحـصـلا الإـجـاـبـة ( أ (رـئـيـس الأركـاـن : 2 لـؤـسـمـلا ىـلـئـيـراـسإلا اـكـيـم مـش ك ..... + اـكـيـم مـش ك ..... : مـن مـيـظـنـت ل مـش مـيـكـا ( أ ( 2 כ مـش مـيـكـا فـقـط ( ب ( 2 כ مـش مـيـكـا + 2 כ بـب ( ج ( 1 כ مـش مـيـكـا + 1 כ بـب ( د ( 2 כ مـش مـيـكـا + 1 כ بـب ( د :ةـحـيـحـصـلا الإـجـاـبـة ( د ( 2 כ مـش مـيـكـا + 1 כ بـب : 3 لـؤـسـمـلا مم 120 ها ةـعـطـق .............. ىـلـئـيـراـسإلا ظـم ل تـاـيـنـاـكـمإ نـم ( أ ( 7 ةـعـطـق ( ب ( 8 ةـعـطـق ( ج ( 10 ةـعـطـق ( د ( 12 ةـعـطـق ( ب :ةـحـيـحـصـلا الإـجـاـبـة ( ب ( 8 ةـعـطـق`;

function normalizeExtractedPdfText(text) {
  if (!text) return '';

  // 1. Remove Tatweel / Kashida (\u0640)
  let clean = text.replace(/\u0640/g, '');

  // 2. Normalize Answer Key markers and strip preceding trailing choice labels
  clean = clean.replace(/(?:[\(\)]?\s*[أبجدa-h1-8]?\s*[\(\)]?\s*:?\s*)?(?:الإجابة الصحيحة|اإلجابة الصحيحة|ةحيحصلا الإجابة|ةحيحصلا اإلجابة|ةحيحصلا الجابة|ةحيحصلا اجابة|ةحيحصلا الإجابة)\s*:?/gi, '\nالإجابة الصحيحة: ');

  // 3. Normalize question headers cleanly (both LTR & RTL reversed)
  clean = clean.replace(/(?:(?:السؤال|سؤال|س|Q|Question|لؤسملا|لؤئسملا|لؤمسملا)\s*:?\s*(\d+)|(\d+)\s*:?\s*(?:السؤال|سؤال|س|Q|Question|لؤسملا|لؤئسملا|لؤمسملا))/gi, (m, p1, p2) => '\n\n#### السؤال ' + (p1 || p2) + ' :\n');

  // 4. Normalize Choice markers like "( أ (" or "( أ )" or "أ(" or "( أ "
  clean = clean.replace(/[\(\)\[\]]\s*([أبجدa-h1-8])\s*[\(\)\[\]]/gi, '\n($1) ');
  clean = clean.replace(/(^|\s+)[\(\)\[\]]?\s*([أبجدa-h1-8])\s*[\(\)\[\]](?=\s*[\u0600-\u06FFa-zA-Z0-9])/gi, '\n($2) ');

  return clean;
}

function extractChoicesFromLine(line) {
  const choicePattern = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;
  const matches = [];
  let match;
  while ((match = choicePattern.exec(line)) !== null) {
    matches.push({
      label: match[1],
      startIndex: match.index,
      matchLength: match[0].length
    });
  }

  if (matches.length === 0) return null;

  const choices = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const textStart = current.startIndex + current.matchLength;
    const textEnd = (i < matches.length - 1) ? matches[i + 1].startIndex : line.length;
    let choiceText = line.slice(textStart, textEnd).trim();
    choiceText = choiceText.replace(/^\*\*\)?\s*/, '').replace(/\*\*$/, '').replace(/[—\-\s]+$/, '').trim();

    if (choiceText) {
      choices.push({
        label: current.label,
        text: choiceText
      });
    }
  }

  return choices.length > 0 ? choices : null;
}

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

function parseCorrectAnswer(rawAns) {
  const cleanAns = rawAns.trim();
  if (/^(?:صح|صحيح|ص|true|yes|نعم)$/i.test(cleanAns)) return ['A'];
  if (/^(?:خطأ|خاطئ|خ|false|no|لا)$/i.test(cleanAns)) return ['B'];

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

function parseDocument(rawText) {
  const normalized = normalizeExtractedPdfText(rawText);
  const lines = normalized.split(/\r?\n/);
  const questions = [];

  let currentQText = '';
  let currentChoices = [];
  let currentCorrectAnswers = [];
  let hasCurrentHeader = false;

  const saveCurrentQuestion = () => {
    let qTextClean = currentQText.trim();
    if (!qTextClean) return;

    if (!hasCurrentHeader && currentChoices.length === 0) {
      currentQText = '';
      return;
    }

    qTextClean = qTextClean.replace(/<!--[\s\S]*?-->/g, '').trim();
    qTextClean = qTextClean.replace(/^(?:#+\s*)*(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*\s*/i, '').trim();

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
        id: `q_${questions.length + 1}`,
        text: qTextClean,
        choices,
        correctAnswer: finalCorrect,
        type
      });
    }

    currentQText = '';
    currentChoices = [];
    currentCorrectAnswers = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cleanLine = line.replace(/[*_]/g, ' ').replace(/\s+/g, ' ').trim();

    const qHeaderMatch = line.match(/^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i);
    const isHeader = !!qHeaderMatch && (
      line.startsWith('#') || 
      /^(?:السؤال|سؤال|س|Q|Question)\s*\d+/i.test(line) ||
      /^\d+[\.\-\)]/i.test(line)
    );

    const answerKeyMatch = cleanLine.match(/^(?:Answer|Correct Answer|Correct|الإجابة|إجابة|الحل|الإجابة الصحيحة)[:\s]+(.+)$/i);
    const extractedChoices = !answerKeyMatch ? extractChoicesFromLine(line) : null;

    if (isHeader && !extractedChoices && !answerKeyMatch) {
      saveCurrentQuestion();
      hasCurrentHeader = true;
      currentQText = qHeaderMatch[1].trim();
      currentChoices = [];
      currentCorrectAnswers = [];
    } else if (answerKeyMatch) {
      const parsedAns = parseCorrectAnswer(answerKeyMatch[1]);
      currentCorrectAnswers.push(...parsedAns);
    } else if (extractedChoices) {
      extractedChoices.forEach(c => {
        let label = c.label.toUpperCase();
        if (arabicChoiceMap[label]) label = arabicChoiceMap[label];
        const choiceId = label;
        if (!currentChoices.some(ch => ch.id === choiceId)) {
          currentChoices.push({
            id: choiceId,
            label: choiceId,
            text: c.text
          });
        }
      });
    } else {
      if (currentChoices.length > 0) {
        currentChoices[currentChoices.length - 1].text += ' ' + cleanLine;
      } else {
        currentQText += (currentQText ? '\n' : '') + cleanLine;
      }
    }
  }
  saveCurrentQuestion();

  return questions;
}

const questions = parseDocument(screenshotText);
console.log("PARSED QUESTIONS COUNT:", questions.length);
console.log(JSON.stringify(questions, null, 2));

