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
  
  let pageText = '';
  let lastY = -1;
  let lastX = -1;
  let lastW = 0;
  
  for (const item of textContent.items) {
    if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
      pageText += '\n';
      lastX = -1;
    } else if (lastX !== -1) {
      let gap = 0;
      if (item.transform[4] < lastX) {
         gap = lastX - (item.transform[4] + item.width);
      } else {
         gap = item.transform[4] - (lastX + lastW);
      }
      
      if (gap > 2) {
         pageText += ' ';
      }
    }
    
    // Ignore empty spacing items if they are output by pdf.js just in case, but keep them if they represent spaces
    // Actually pdfjs empty strings sometimes mean a new text block, but we already handle gap.
    pageText += item.str;
    lastY = item.transform[5];
    lastX = item.transform[4];
    lastW = item.width;
  }
  
  console.log(pageText.substring(0, 1000));
}
run().catch(console.error);
