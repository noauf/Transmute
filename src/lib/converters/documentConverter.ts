import { ConversionResult } from '@/types';
import { buildOutputFilename } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

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

async function docxToHtml(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

async function docxToText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function markdownToHtml(text: string): Promise<string> {
  const { marked } = await import('marked');
  return await marked(text);
}

function htmlToText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  return md.trim();
}

async function textToPdf(text: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(text, 180);
  let y = 15;
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
    doc.text(line, 15, y);
    y += 7;
  }

  return doc.output('blob');
}

async function htmlToPdf(html: string): Promise<Blob> {
  const text = htmlToText(html);
  return textToPdf(text);
}

async function pdfToText(file: File): Promise<string> {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  let text = `PDF Document: ${file.name}\n`;
  text += `Pages: ${pages.length}\n\n`;

  const form = pdfDoc.getForm();
  try {
    const fields = form.getFields();
    if (fields.length > 0) {
      text += `Form Fields:\n`;
      fields.forEach((field) => {
        text += `- ${field.getName()}\n`;
      });
    }
  } catch {
    // No form fields
  }

  text += `\nNote: Full text extraction from PDF requires OCR. This extracts metadata and structure.\n`;
  return text;
}

export async function convertDocument(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(10);

  const sourceExt = getExtension(file.name);
  let resultBlob: Blob;

  onProgress?.(30);

  switch (sourceExt) {
    case 'docx': {
      if (targetFormat === 'html') {
        const html = await docxToHtml(file);
        resultBlob = new Blob([html], { type: 'text/html' });
      } else if (targetFormat === 'txt') {
        const text = await docxToText(file);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'pdf') {
        const html = await docxToHtml(file);
        resultBlob = await htmlToPdf(html);
      } else {
        throw new Error(`Unsupported: docx to ${targetFormat}`);
      }
      break;
    }

    case 'md': {
      const mdText = await readFileAsText(file);
      if (targetFormat === 'html') {
        const html = await markdownToHtml(mdText);
        resultBlob = new Blob([html], { type: 'text/html' });
      } else if (targetFormat === 'pdf') {
        resultBlob = await textToPdf(mdText);
      } else if (targetFormat === 'txt') {
        resultBlob = new Blob([mdText], { type: 'text/plain' });
      } else {
        throw new Error(`Unsupported: md to ${targetFormat}`);
      }
      break;
    }

    case 'html':
    case 'htm': {
      const html = await readFileAsText(file);
      if (targetFormat === 'pdf') {
        resultBlob = await htmlToPdf(html);
      } else if (targetFormat === 'txt') {
        const text = htmlToText(html);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'md') {
        const md = htmlToMarkdown(html);
        resultBlob = new Blob([md], { type: 'text/markdown' });
      } else {
        throw new Error(`Unsupported: html to ${targetFormat}`);
      }
      break;
    }

    case 'txt': {
      const text = await readFileAsText(file);
      if (targetFormat === 'pdf') {
        resultBlob = await textToPdf(text);
      } else if (targetFormat === 'html') {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
        resultBlob = new Blob([html], { type: 'text/html' });
      } else if (targetFormat === 'md') {
        resultBlob = new Blob([text], { type: 'text/markdown' });
      } else {
        throw new Error(`Unsupported: txt to ${targetFormat}`);
      }
      break;
    }

    case 'pdf': {
      if (targetFormat === 'txt') {
        const text = await pdfToText(file);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else {
        throw new Error(`Unsupported: pdf to ${targetFormat}`);
      }
      break;
    }

    default:
      throw new Error(`Unsupported source format: ${sourceExt}`);
  }

  onProgress?.(100);

  return {
    blob: resultBlob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}
