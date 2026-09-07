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
      // For RTL, item is placed to the left of the previous item.
      // So lastX should be greater than item.transform[4].
      // The distance between the left edge of the previous char and the right edge of this char.
      // Actually, PDF.js usually gives transform[4] as the left-most coordinate of the glyph.
      // For RTL, the origin might still be bottom-left. Let's calculate gap:
      const gap = Math.abs(lastX - (item.transform[4] + item.width));
      // Let's print gaps for the first few items
      if (pageText.length < 50) {
        // console.log(`char: '${item.str}', gap: ${gap.toFixed(2)}`);
      }
      
      // Let's try adding a space if gap > 2.5
      // Wait, in my previous log: 'ة' to 'م' gap was 4.09. 'ر' to 'ا' was 1.19. 'ا' to 'ت' was 12.15.
      // If we add space for gap > 3:
      // 'ة' to 'م' (4.09) -> space. Good.
      // 'ر' to 'ا' (1.19) -> no space. Good.
      // 'ا' to 'ت' (12.15) -> space. BAD (واجبات -> واجبا ت).
      if (gap > 4) { // Let's try 4
        pageText += ' ';
      }
    }
    pageText += item.str;
    lastY = item.transform[5];
    lastX = item.transform[4];
  }
  
  console.log(pageText.substring(0, 500));
}
run().catch(console.error);
