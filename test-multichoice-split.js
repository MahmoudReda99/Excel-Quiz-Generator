// Test splitting line with multiple choices:
const line = "أ( 2 ك مش ميكا فقط ب( 2 ك مش ميكا + 2 ك بب";

// Can we split multiple choices on the same line?
// Pattern for choice label: (أ) or أ( or أ) or أ. or A. or A)
const choiceRegex = /(?:^|\s+)(?:\[[ xX]\]\s*)?[\(\)]?([A-Ha-hأ-ي1-8])[\.\)\:\-\(][\(\)]?\s*/g;

// Let's trace how we can split line into individual choices!
console.log("Original line:", line);
