const fs = require('fs');

let code = fs.readFileSync('test-complete-solution.js', 'utf8');

// Fix: if qTextClean is empty, but we have choices or header, keep "السؤال X"
code = code.replace(
  'if (qTextClean) {',
  `if (!qTextClean && (currentChoices.length > 0 || hasCurrentHeader)) {
      qTextClean = currentHeaderTitle || \`السؤال \${questions.length + 1}\`;
   }
   if (qTextClean) {`
);

// Keep track of currentHeaderTitle
code = code.replace(
  'currentQText = qHeaderMatch[1].trim();',
  'currentHeaderTitle = qHeaderMatch[0].replace(/^#+\\s*/, "").trim(); currentQText = qHeaderMatch[1].trim();'
);
code = code.replace(
  'let hasCurrentHeader = false;',
  'let hasCurrentHeader = false; let currentHeaderTitle = "";'
);

fs.writeFileSync('test-fix-empty-qtext-run.js', code);
