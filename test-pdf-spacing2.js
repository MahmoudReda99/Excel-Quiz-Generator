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
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  let lastX = -1;
  let pageText = '';
  
  // Just print the first line "جمهورية مصر العربية"
  let i = 0;
  for (const item of textContent.items) {
    if (i++ > 30) break;
    const gap = lastX !== -1 ? (lastX - (item.transform[4] + item.width)) : 0;
    console.log(`char: '${item.str}', gap: ${gap.toFixed(2)}`);
    lastX = item.transform[4];
  }
}
run().catch(console.error);
