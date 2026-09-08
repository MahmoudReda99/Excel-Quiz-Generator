// Sample text from user screenshot:
const sampleMangled = `)ضباط( وعد و عـلاطتسـا : دقاملا مـرسـا 1 ذجومن : ذجومنلا مـسـا ىـلـعلأا ىوتسملل عـلاطتسإلا لـتاق تـاـمـيـلـعـتـو القائد تـاـمـيـلـعـت ىـلـع ًاءاـنـب عـلاطتسإلا إدارةو مـيـظـنـت نـع رئيس الأركان : 1 السؤال أ( رئيس الأركان ب( القائد ج( رئيس الإستطلاع الإجابة الصحيحة : أ( رئيس الأركان السؤال 2 : من تنظيم ل مش ميكا الإسرائيلي ..... ك مش ميكا + ..... ك بب أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب ج( 1 ك مش ميكا + 1 ك بب د( 2 ك مش ميكا + 1 ك بب الإجابة الصحيحة : د( 2 ك مش ميكا + 1 ك بب السؤال 3 : من إمكانيات ل مظ الإسرائيلي .............. قطعة ها 120 مم أ( 7 قطعة ب( 8 قطعة ج( 10 قطعة د( 12 قطعة الإجابة الصحيحة : ب( 8 قطعة`;

// 1. Remove Tatweel (Kashida \u0640)
let clean = sampleMangled.replace(/\u0640/g, '');

console.log("Cleaned Tatweel:\n", clean);

// Check if string contains reversed Arabic keywords like ذجومن, ةحيحصلا, ةجابالإ
function isReversedArabic(str) {
  return /ذجومن|ةحيحصلا|ةجابالإ|لؤسملا|لاطتسإ/i.test(str);
}

console.log("Is Reversed?", isReversedArabic(clean));

function unreverseArabicWords(str) {
  // If the PDF extracted Arabic words letter-by-letter reversed
  // E.g. ذجومن -> نموذج, ةحيحصلا -> الصحيحة
  return str.split(/\s+/).map(word => {
    // If word contains Arabic chars and is reversed
    if (/[\u0600-\u06FF]/.test(word)) {
      // Check specific reversed words or reverse string if needed
      return word.split('').reverse().join('');
    }
    return word;
  }).join(' ');
}

