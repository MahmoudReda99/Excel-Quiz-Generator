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
  
  for (const item of textContent.items) {
    if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 4) {
      pageText += '\n';
      lastX = -1;
    } else if (lastX !== -1) {
      // In RTL, items are positioned from right to left.
      // The left edge of the previous char is lastX.
      // The right edge of the current char is item.transform[4] + item.width.
      // Distance = left_edge_prev - right_edge_curr
      let gap = lastX - (item.transform[4] + item.width);
      
      // Sometimes it's LTR in the same line (like numbers). 
      // If gap is negative, it might be LTR, so distance is left_edge_curr - right_edge_prev
      // Just check absolute gap but be careful with overlapping bounding boxes.
      
      if (gap > 2) {
        pageText += ' ';
      } else if (gap < -2 && item.transform[4] > lastX) {
        // LTR case
        let ltrGap = item.transform[4] - (lastX + 10); // Approximation
        if (ltrGap > 2) pageText += ' ';
      }
    }
    pageText += item.str;
    lastY = item.transform[5];
    lastX = item.transform[4];
  }
  
  console.log(pageText.substring(0, 500));
}
run().catch(console.error);
