if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

async function run() {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfPath = '/Users/mahmoudreda/.gemini/antigravity/brain/b27d0922-110e-4d60-a3da-415178d315fb/.user_uploaded/media_1788807490114.pdf';

  const loadingTask = pdfjsLib.getDocument(pdfPath);
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= 2; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    let lastY = -1;
    let pageText = '';
    
    for (const item of textContent.items) {
      if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
        pageText += '\n';
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    
    fullText += pageText + '\n\n';
  }
  
  console.log("=== First 500 characters ===");
  console.log(fullText.substring(0, 500));
}

run().catch(console.error);
