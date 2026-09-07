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
  
  // Just print the first line items
  for(let i=0; i<30; i++) {
     const item = textContent.items[i];
     console.log(`char: '${item.str}', x: ${item.transform[4].toFixed(2)}, y: ${item.transform[5].toFixed(2)}, w: ${item.width.toFixed(2)}`);
  }
}
run().catch(console.error);
