let text = "هذا نص تجريبي ) أفق ( وهنا )المرجع، ص 33( وبعض الأقواس الأخرى )أ( و )ب(.";

// Flip brackets for Arabic text
text = text.replace(/\)([\s\u0600-\u06FF0-9\-.,،]+?)\(/g, '($1)');

console.log(text);
