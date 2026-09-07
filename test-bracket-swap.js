let text = `
- )أ( المقدمة
- ] اإلجابة الصحيحة [ )ج( الخالصة العامة — )المرجع، ص 333، بند 433-أ(
`;

function swapBrackets(str) {
  return str.split('').map(char => {
    if (char === '(') return ')';
    if (char === ')') return '(';
    if (char === '[') return ']';
    if (char === ']') return '[';
    return char;
  }).join('');
}

console.log(swapBrackets(text));
