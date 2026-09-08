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

function normalizePdfText(text) {
  let clean = text.replace(/\u0640/g, '');

  // 1. Normalize True / False reversed pairs (e.g. حص ) أ أطخ ) ب)
  clean = clean.replace(/حص\s*[\(\)]\s*([أA])\s*أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) صح\n($2) خطأ\n');
  clean = clean.replace(/أطخ\s*[\(\)]\s*([بB])\s*حص\s*[\(\)]\s*([أA])/gi, '\n($1) خطأ\n($2) صح\n');
  clean = clean.replace(/(?:^|\s+)حص\s*[\(\)]\s*([أA])/gi, '\n($1) صح\n');
  clean = clean.replace(/(?:^|\s+)أطخ\s*[\(\)]\s*([بB])/gi, '\n($1) خطأ\n');

  // 2. Answer Key normalization
  const ansRegex = /[:\s]*(?:ة\s*حيحصلا|الصحيحة|اإلجابة|الإجابة|الحل)\s*(?:ة\s*باجلاإ|باجلاإ|الإجابة|اإلجابة|الصحيحة)[:\s]*/gi;
  clean = clean.replace(ansRegex, '\nالإجابة الصحيحة: ');

  // 3. Question Header normalization (handles reversed 'الؤسلا' / 'لؤسملا' / 'السؤال')
  const headerRegex = /(?:[:\s]+(\d+)\s*(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)|(?:الؤسلا|لؤسملا|لؤئسملا|السؤال|سؤال|س|Q|Question)\s*[:\s]*(\d+))/gi;
  clean = clean.replace(headerRegex, (m, p1, p2) => '\n\n#### السؤال ' + (p1 || p2) + ' :\n');

  // 4. Choice markers normalization
  clean = clean.replace(/[\(\)]\s*([أبجدa-h1-8])\s*[\(\)]/gi, '\n($1) ');
  clean = clean.replace(/[\(\)]\s*([أبجدa-h1-8])(?=\s+|$)/gi, '\n($1) ');
  clean = clean.replace(/(?:^|\s+)([أبجدa-h1-8])\s*[\(\)](?=\s+|$)/gi, '\n($1) ');

  return clean;
}

const arabicChoiceMap = {
  'أ': 'A', 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D',
  'هـ': 'E', 'ه': 'E', 'و': 'F', 'ز': 'G', 'ح': 'H'
};

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

function parseQuestions(rawText) {
  const text = normalizePdfText(rawText);
  const lines = text.split(/\r?\n/);
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

const res = parseQuestions(snippet);
console.log("Total Questions extracted:", res.length);
res.forEach(q => {
  console.log(`Q: ${q.id} | Correct: ${q.correctAnswer} | Choices (${q.choices.length}): ${q.choices.map(c => c.id + ': ' + c.text).join(' | ')}`);
});
