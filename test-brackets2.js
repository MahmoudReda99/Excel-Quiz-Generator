let text = "(النص الأول) و (النص الثاني) وأيضاً )أفق(";

text = text.replace(/\)([\s\u0600-\u06FF0-9\-.,،]+?)\(/g, '($1)');

console.log(text);
