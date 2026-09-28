/**
 * Generates a thumbnail from the first page of a PDF using pdf.js.
 * Returns a WebP Blob for storage.
 * 
 * Note: Requires `pdfjs-dist` to be installed.
 */
export async function generatePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    // Dynamic import to avoid bundling pdfjs in the main bundle
    // We use the modern ESM build
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source to CDN to avoid needing to copy worker files to public/
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    
    const THUMB_WIDTH = 600; // Good resolution for high-DPI displays
    const viewport = page.getViewport({ scale: 1 });
    const scale = THUMB_WIDTH / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d')!;
    
    await page.render({ canvasContext: ctx, viewport: scaledViewport, canvas }).promise;
    
    return new Promise((resolve) => 
      canvas.toBlob(resolve, 'image/webp', 0.8)
    );
  } catch (error) {
    console.error('Failed to generate PDF thumbnail:', error);
    return null; // Graceful fallback
  }
}
