const fs = require('fs');

async function run() {
  const { extractText } = await import('./pdf-extractor-mock.mjs');
  const text = await extractText('/Users/mahmoudreda/.gemini/antigravity/brain/b27d0922-110e-4d60-a3da-415178d315fb/.user_uploaded/media_1788807490114.pdf');
  console.log("Extracted length:", text.length);
  
  const { parseMarkdownToQuestions } = await import('./md-parser-mock.mjs');
  const questions = parseMarkdownToQuestions(text);
  console.log("Parsed questions:", questions.length);
  if (questions.length === 0) {
    console.log(text.slice(0, 1000));
  }
}
run();
