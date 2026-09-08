const testHeaders = [
  "السؤال 1 : المسئول المباشر عن تنظيم وإدارة اإلستطالع بناًء على تعليمات القائد",
  "السؤال 2 : من تنظيم ل مش ميكا اإلسرائيلي ..... ك مش ميكا + ..... ك بب",
  "السؤال 10 : المفاجأة وتحقيقها من خالل الخداع واإلخفاء والجرأة",
  "#### السؤال 15: من متطلبات تحقيق االستمرار",
  "1. ما هو المبدأ الرئيسي",
  "Q1: What is the main principle"
];

const headerRegex = /^(?:#+\s*|\d+[\.\-\)]\s*|(?:السؤال|سؤال|س|Q|Question)\s*\d+[\s:\.\-]*)(.*)$/i;

for (const h of testHeaders) {
  const m = h.match(headerRegex);
  console.log("HEADER:", h);
  console.log("CLEAN TEXT:", m ? m[1].trim() : h);
  console.log("---");
}
