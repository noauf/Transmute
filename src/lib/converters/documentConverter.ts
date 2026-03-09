import { ConversionResult } from '@/types';
import { buildOutputFilename } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

/* ============================================
   File reading helpers
   ============================================ */

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

/* ============================================
   Styled HTML document wrapper
   
   This is used for ALL HTML output and as the
   intermediate step for PDF rendering. Embeds
   full CSS so the document looks correct both
   as a standalone .html file and when rendered
   to PDF via jsPDF.html().
   ============================================ */

function wrapInStyledHtml(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  /* Reset */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1a1a1a;
    background: #ffffff;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.4em;
    margin-bottom: 0.6em;
    font-weight: 700;
    line-height: 1.3;
    color: #111111;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eeeeee; padding-bottom: 0.25em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1.1em; }
  h5, h6 { font-size: 1em; color: #555555; }

  /* Paragraphs & inline */
  p { margin-bottom: 1em; }
  strong, b { font-weight: 700; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  s, strike, del { text-decoration: line-through; color: #888; }
  small { font-size: 0.85em; }
  sup { vertical-align: super; font-size: 0.75em; }
  sub { vertical-align: sub; font-size: 0.75em; }
  mark { background: #fff3b0; padding: 0.1em 0.2em; border-radius: 2px; }
  abbr { text-decoration: underline dotted; cursor: help; }

  /* Links */
  a { color: #0066cc; text-decoration: underline; }
  a:hover { color: #004499; }

  /* Lists */
  ul, ol { margin-bottom: 1em; padding-left: 2em; }
  ul ul, ol ol, ul ol, ol ul { margin-bottom: 0; }
  li { margin-bottom: 0.3em; }
  li > p { margin-bottom: 0.3em; }

  /* Blockquote */
  blockquote {
    margin: 1em 0;
    padding: 0.8em 1.2em;
    border-left: 4px solid #0066cc;
    background: #f6f8fa;
    color: #333;
    font-style: italic;
  }
  blockquote p:last-child { margin-bottom: 0; }

  /* Code */
  code {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    background: #f0f0f0;
    padding: 0.15em 0.4em;
    border-radius: 3px;
    color: #c7254e;
  }
  pre {
    margin: 1em 0;
    padding: 1em;
    background: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 0.9em;
    line-height: 1.5;
  }
  pre code {
    background: none;
    padding: 0;
    border-radius: 0;
    color: inherit;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.95em;
  }
  th, td {
    padding: 8px 12px;
    border: 1px solid #d0d7de;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f6f8fa;
    font-weight: 700;
    color: #111;
  }
  tr:nth-child(even) { background: #fafbfc; }
  caption {
    caption-side: bottom;
    padding: 8px;
    font-size: 0.9em;
    color: #666;
    font-style: italic;
  }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid #e5e5e5;
    margin: 2em 0;
  }

  /* Images embedded in documents */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 1em 0;
  }

  /* Definition lists */
  dl { margin-bottom: 1em; }
  dt { font-weight: 700; margin-top: 0.5em; }
  dd { margin-left: 2em; margin-bottom: 0.5em; }

  /* Figure */
  figure { margin: 1.5em 0; text-align: center; }
  figcaption { font-size: 0.9em; color: #666; margin-top: 0.5em; font-style: italic; }

  /* First element shouldn't have top margin */
  body > *:first-child { margin-top: 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================
   Source → HTML conversions
   ============================================ */

async function docxToHtml(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.convertToHtml({
    arrayBuffer,
  });
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
  // Parse properly using DOMParser for reliable conversion
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'h1': return `# ${children.trim()}\n\n`;
      case 'h2': return `## ${children.trim()}\n\n`;
      case 'h3': return `### ${children.trim()}\n\n`;
      case 'h4': return `#### ${children.trim()}\n\n`;
      case 'h5': return `##### ${children.trim()}\n\n`;
      case 'h6': return `###### ${children.trim()}\n\n`;
      case 'p': return `${children.trim()}\n\n`;
      case 'br': return '\n';
      case 'hr': return '\n---\n\n';
      case 'strong':
      case 'b': return `**${children}**`;
      case 'em':
      case 'i': return `*${children}*`;
      case 'u': return `<u>${children}</u>`;
      case 's':
      case 'strike':
      case 'del': return `~~${children}~~`;
      case 'code': return `\`${children}\``;
      case 'pre': return `\n\`\`\`\n${children.trim()}\n\`\`\`\n\n`;
      case 'blockquote': return children.split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
      case 'a': {
        const href = el.getAttribute('href') || '';
        return `[${children}](${href})`;
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      }
      case 'ul': {
        const items = Array.from(el.children)
          .filter(c => c.tagName.toLowerCase() === 'li')
          .map(c => `- ${walk(c).trim()}`)
          .join('\n');
        return `${items}\n\n`;
      }
      case 'ol': {
        const items = Array.from(el.children)
          .filter(c => c.tagName.toLowerCase() === 'li')
          .map((c, i) => `${i + 1}. ${walk(c).trim()}`)
          .join('\n');
        return `${items}\n\n`;
      }
      case 'li': return children;
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return children;

        const tableData: string[][] = rows.map(row =>
          Array.from(row.querySelectorAll('th, td')).map(cell => walk(cell).trim())
        );

        if (tableData.length === 0) return '';

        const colCount = Math.max(...tableData.map(r => r.length));
        const colWidths = Array.from({ length: colCount }, (_, i) =>
          Math.max(3, ...tableData.map(r => (r[i] || '').length))
        );

        const formatRow = (row: string[]) =>
          '| ' + colWidths.map((w, i) => (row[i] || '').padEnd(w)).join(' | ') + ' |';

        const separator = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';

        const lines = [formatRow(tableData[0]), separator, ...tableData.slice(1).map(formatRow)];
        return lines.join('\n') + '\n\n';
      }
      case 'div':
      case 'section':
      case 'article':
      case 'main':
      case 'span':
        return children;
      default:
        return children;
    }
  }

  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}

/* ============================================
   HTML → PDF via jsPDF.html()
   
   Renders a styled HTML document into a real
   PDF by injecting it into a hidden DOM container
   and using jsPDF's html() method (backed by
   html2canvas) to capture the visual rendering.
   ============================================ */

async function renderHtmlToPdf(htmlContent: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  // html2canvas-pro is imported for its side-effect:
  // jsPDF.html() looks for it on the window/global scope
  const html2canvas = (await import('html2canvas-pro')).default;

  // Create a hidden container for rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width in px at 96dpi
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';

  // Parse the HTML and inject just the body + styles
  const parser = new DOMParser();
  const parsed = parser.parseFromString(htmlContent, 'text/html');

  // Apply styles inline
  const styleEl = parsed.querySelector('style');
  const bodyContent = parsed.body.innerHTML;

  if (styleEl) {
    const style = document.createElement('style');
    style.textContent = styleEl.textContent;
    container.appendChild(style);
  }

  const content = document.createElement('div');
  content.innerHTML = bodyContent;
  content.style.padding = '40px';
  content.style.fontFamily = "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  content.style.fontSize = '14px';
  content.style.lineHeight = '1.7';
  content.style.color = '#1a1a1a';
  container.appendChild(content);

  document.body.appendChild(container);

  // Wait for fonts/images to load
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    // A4 dimensions in mm: 210 x 297
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 15; // mm

    // Capture the rendered content as a canvas
    const canvas = await html2canvas(content, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    // Calculate how the content maps to PDF pages
    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageContentHeight = pdfHeight - margin * 2;

    if (imgHeight <= pageContentHeight) {
      // Single page — fits entirely
      doc.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        margin,
        margin,
        imgWidth,
        imgHeight
      );
    } else {
      // Multi-page — slice the canvas into page-sized chunks
      const totalPages = Math.ceil(imgHeight / pageContentHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) doc.addPage();

        // Calculate the portion of the source canvas for this page
        const sourceY = (page * pageContentHeight * canvas.width) / imgWidth;
        const sourceHeight = Math.min(
          (pageContentHeight * canvas.width) / imgWidth,
          canvas.height - sourceY
        );

        // Create a canvas slice for this page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, sourceY,
            canvas.width, sourceHeight,
            0, 0,
            canvas.width, sourceHeight
          );
        }

        const sliceHeight = (sourceHeight * imgWidth) / canvas.width;

        doc.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          margin,
          margin,
          imgWidth,
          sliceHeight
        );
      }
    }

    return doc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

/* ============================================
   Plain text → PDF (for .txt files)
   Still uses jsPDF.text() since plain text
   has no formatting to preserve.
   ============================================ */

async function plainTextToPdf(text: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);

  const lines = doc.splitTextToSize(text, 170);
  let y = 20;
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 20, y);
    y += 6;
  }

  return doc.output('blob');
}

/* ============================================
   PDF → Text extraction
   ============================================ */

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

/* ============================================
   Main export
   ============================================ */

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
        const bodyHtml = await docxToHtml(file);
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        resultBlob = new Blob([styledHtml], { type: 'text/html' });
      } else if (targetFormat === 'txt') {
        const text = await docxToText(file);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'pdf') {
        onProgress?.(40);
        const bodyHtml = await docxToHtml(file);
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        onProgress?.(60);
        resultBlob = await renderHtmlToPdf(styledHtml);
      } else {
        throw new Error(`Unsupported: docx to ${targetFormat}`);
      }
      break;
    }

    case 'md': {
      const mdText = await readFileAsText(file);
      if (targetFormat === 'html') {
        const bodyHtml = await markdownToHtml(mdText);
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        resultBlob = new Blob([styledHtml], { type: 'text/html' });
      } else if (targetFormat === 'pdf') {
        onProgress?.(40);
        const bodyHtml = await markdownToHtml(mdText);
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        onProgress?.(60);
        resultBlob = await renderHtmlToPdf(styledHtml);
      } else if (targetFormat === 'txt') {
        // Strip markdown syntax for plain text
        const bodyHtml = await markdownToHtml(mdText);
        const text = htmlToText(bodyHtml);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else {
        throw new Error(`Unsupported: md to ${targetFormat}`);
      }
      break;
    }

    case 'html':
    case 'htm': {
      const rawHtml = await readFileAsText(file);
      if (targetFormat === 'pdf') {
        onProgress?.(40);
        // If the HTML already has a <style> or is a full document, use as-is
        // Otherwise wrap it in our styled wrapper
        const hasFullDoc = rawHtml.toLowerCase().includes('<!doctype') || rawHtml.toLowerCase().includes('<html');
        const htmlForPdf = hasFullDoc ? rawHtml : wrapInStyledHtml(rawHtml, file.name);
        onProgress?.(60);
        resultBlob = await renderHtmlToPdf(htmlForPdf);
      } else if (targetFormat === 'txt') {
        const text = htmlToText(rawHtml);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'md') {
        const md = htmlToMarkdown(rawHtml);
        resultBlob = new Blob([md], { type: 'text/markdown' });
      } else {
        throw new Error(`Unsupported: html to ${targetFormat}`);
      }
      break;
    }

    case 'txt': {
      const text = await readFileAsText(file);
      if (targetFormat === 'pdf') {
        resultBlob = await plainTextToPdf(text);
      } else if (targetFormat === 'html') {
        const bodyHtml = `<pre><code>${escapeHtml(text)}</code></pre>`;
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        resultBlob = new Blob([styledHtml], { type: 'text/html' });
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
