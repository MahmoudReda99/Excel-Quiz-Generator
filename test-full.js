const fs = require('fs');

async function run() {
  const fileData = new Uint8Array(fs.readFileSync('/Users/mahmoudreda/.gemini/antigravity/brain/b27d0922-110e-4d60-a3da-415178d315fb/.user_uploaded/media_1788807490114.pdf'));
  
  // We need to use dynamic import for pdfjs if we can't easily require it, or just use strings if we have it
  console.log("File loaded:", fileData.length, "bytes");
}
run();
