import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

/**
 * Presentation converter.
 * Uses pptxgenjs for writing .pptx files.
 * Uses jszip for reading .pptx files (extract text from XML).
 *
 * Supported routes:
 *   txt, md, html → pptx (generate slides)
 *   pptx → txt, html, pdf
 */

const PPTX_EXTENSIONS = new Set(['pptx']);

export function isPresentationConversion(sourceExt: string, targetFormat: string): boolean {
  return PPTX_EXTENSIONS.has(sourceExt) || PPTX_EXTENSIONS.has(targetFormat);
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/* ── Read PPTX (extract text from slides) ── */

async function extractPptxText(buffer: ArrayBuffer): Promise<string[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const slideTexts: string[] = [];
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  for (const slideFile of slideFiles) {
    const content = await zip.file(slideFile)?.async('string');
    if (!content) continue;

    // Extract text from <a:t> tags (PowerPoint text elements)
    const texts: string[] = [];
    const textRegex = /<a:t>([^<]*)<\/a:t>/g;
    let match;
    while ((match = textRegex.exec(content)) !== null) {
      if (match[1].trim()) texts.push(match[1]);
    }
    if (texts.length > 0) {
      slideTexts.push(texts.join(' '));
    }
  }

  return slideTexts;
}

/* ── Write PPTX ── */

interface SlideContent {
  title: string;
  body: string;
}

function splitTextIntoSlides(text: string, title: string): SlideContent[] {
  const slides: SlideContent[] = [];

  // Split on double newlines or specific markers
  const sections = text.split(/\n{2,}/);
  let currentSlide: SlideContent = { title, body: '' };
  let bodyLines: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // If accumulated body is getting long, start a new slide
    if (bodyLines.join('\n').length > 500) {
      currentSlide.body = bodyLines.join('\n');
      slides.push(currentSlide);
      bodyLines = [];
      currentSlide = { title: '', body: '' };
    }

    bodyLines.push(trimmed);
  }

  if (bodyLines.length > 0) {
    currentSlide.body = bodyLines.join('\n');
    slides.push(currentSlide);
  }

  // If first slide has no title, use the provided title
  if (slides.length > 0 && !slides[0].title) {
    slides[0].title = title;
  }

  return slides.length > 0 ? slides : [{ title, body: text }];
}

function splitMarkdownIntoSlides(mdText: string): SlideContent[] {
  const slides: SlideContent[] = [];
  // Split on headings (# or ##)
  const sections = mdText.split(/^(?=#{1,2}\s)/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^#{1,2}\s+(.*)/m);
    const title = headingMatch ? headingMatch[1].trim() : '';
    const body = headingMatch
      ? trimmed.substring(headingMatch[0].length).trim()
      : trimmed;

    // Clean markdown syntax for plain text in slides
    const cleanBody = body
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*]\s+/gm, '  - ')
      .replace(/^\d+\.\s+/gm, (m) => '  ' + m);

    slides.push({ title: title || 'Slide', body: cleanBody });
  }

  return slides.length > 0 ? slides : [{ title: 'Untitled', body: mdText }];
}

async function createPptx(slides: SlideContent[]): Promise<Blob> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Transmute';

  for (const slide of slides) {
    const s = pptx.addSlide();

    if (slide.title) {
      s.addText(slide.title, {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 1,
        fontSize: 28,
        bold: true,
        color: '2d1f14',
        fontFace: 'Arial',
      });
    }

    if (slide.body) {
      // Truncate very long bodies
      const bodyText = slide.body.length > 2000 ? slide.body.slice(0, 2000) + '...' : slide.body;
      s.addText(bodyText, {
        x: 0.5,
        y: slide.title ? 1.5 : 0.5,
        w: '90%',
        h: slide.title ? 5.5 : 6.5,
        fontSize: 14,
        color: '4a3728',
        fontFace: 'Arial',
        valign: 'top',
        paraSpaceAfter: 8,
      });
    }
  }

  const output = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Blob([output], { type: getMimeType('pptx') });
}

/* ── Main converter ── */

export async function convertPresentation(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(10);

  const sourceExt = getExtension(file.name);
  let resultBlob: Blob;
  const title = file.name.replace(/\.[^.]+$/, '');

  if (sourceExt === 'pptx') {
    // PPTX → other format
    const buffer = await readFileAsArrayBuffer(file);
    onProgress?.(30);

    const slideTexts = await extractPptxText(buffer);
    onProgress?.(60);

    switch (targetFormat) {
      case 'txt': {
        const fullText = slideTexts
          .map((text, i) => `--- Slide ${i + 1} ---\n${text}`)
          .join('\n\n');
        resultBlob = new Blob([fullText], { type: getMimeType('txt') });
        break;
      }
      case 'html': {
        const slidesHtml = slideTexts
          .map((text, i) => `<section><h2>Slide ${i + 1}</h2><p>${escapeHtml(text)}</p></section>`)
          .join('\n');
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px}section{margin:2em 0;padding:1em;border:1px solid #e5e5e5;border-radius:8px}h2{color:#333}</style>
</head><body><h1>${escapeHtml(title)}</h1>${slidesHtml}</body></html>`;
        resultBlob = new Blob([fullHtml], { type: getMimeType('html') });
        break;
      }
      case 'pdf': {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const fullText = slideTexts.join('\n\n');
        const lines = doc.splitTextToSize(fullText, 170);
        let y = 20;
        doc.setFontSize(18);
        doc.text(title, 20, y);
        y += 12;
        doc.setFontSize(11);
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(line, 20, y);
          y += 6;
        }
        resultBlob = doc.output('blob');
        break;
      }
      case 'md': {
        const md = slideTexts
          .map((text, i) => `## Slide ${i + 1}\n\n${text}`)
          .join('\n\n---\n\n');
        resultBlob = new Blob([`# ${title}\n\n${md}`], { type: getMimeType('md') });
        break;
      }
      default:
        throw new Error(`Unsupported: pptx → ${targetFormat}`);
    }
  } else {
    // Other format → PPTX
    let slides: SlideContent[];

    switch (sourceExt) {
      case 'txt': {
        const text = await readFileAsText(file);
        slides = splitTextIntoSlides(text, title);
        break;
      }
      case 'md': {
        const text = await readFileAsText(file);
        slides = splitMarkdownIntoSlides(text);
        break;
      }
      case 'html':
      case 'htm': {
        const html = await readFileAsText(file);
        const text = stripHtmlTags(html);
        slides = splitTextIntoSlides(text, title);
        break;
      }
      default:
        throw new Error(`Unsupported: ${sourceExt} → pptx`);
    }

    onProgress?.(50);
    resultBlob = await createPptx(slides);
  }

  onProgress?.(100);

  return {
    blob: resultBlob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}
