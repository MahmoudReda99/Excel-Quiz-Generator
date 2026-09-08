const reversedSnippet = `الؤسلا : 16 طقف برحلا ن مز يف ) أ ( طقف ملسلا ن مز يف ) ب ( د برحلاو ملسلا يف تاوقلأا عيمج يف ) ج ( د برحلاو ملسلا يف تاوقلأا عيمج يف ) ج :ةحيحصلا باجلاإ`;

function reverseWord(w) {
  return w.split('').reverse().join('');
}

console.log("Snippet words reversed:");
console.log(reversedSnippet.split(' ').map(reverseWord).join(' '));
