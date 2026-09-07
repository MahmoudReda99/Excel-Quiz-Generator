let text = `
األقمار الصناعية
واألجهزة باإلضافة إلى اآلالت.
لألقمار
االمتحانية
سؤاًال
من ص 314 إىل ص 366
عىل الطاولة
أمىل عليه
الخالصة العامة
اإللكترونية واالحتفاظ
`;

function fixArabicLigatures(str) {
  // Fix definite article with Hamza reversals: األ -> الأ, اإل -> الإ, الخ
  // Covers prefixes: ا, وا, فا, با, كا
  str = str.replace(/(^|[\s،.؟!\-()\[\]])([وبفك]?)ا([أإآا])ل/g, '$1$2ال$3');
  
  // Fix li- prefix: لأل -> للأ
  str = str.replace(/(^|[\s،.؟!\-()\[\]])ل([أإآا])ل/g, '$1لل$2');
  
  // Fix Alif-Maksura + Lam reversal at the end of words: ىل -> لى
  str = str.replace(/ىل(?=[\s،.؟!\-()\[\]]|$)/g, 'لى');
  
  // Fix Tanween reversal: ًال -> لاً
  str = str.replace(/ًال/g, 'لاً');
  
  return str;
}

console.log("BEFORE:");
console.log(text);
console.log("AFTER:");
console.log(fixArabicLigatures(text));

