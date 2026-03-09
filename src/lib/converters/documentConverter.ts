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
   ============================================ */

function wrapInStyledHtml(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
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
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.4em; margin-bottom: 0.6em; font-weight: 700; line-height: 1.3; color: #111111;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eeeeee; padding-bottom: 0.25em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1.1em; }
  h5, h6 { font-size: 1em; color: #555555; }
  p { margin-bottom: 1em; }
  strong, b { font-weight: 700; }
  em, i { font-style: italic; }
  a { color: #0066cc; text-decoration: underline; }
  ul, ol { margin-bottom: 1em; padding-left: 2em; }
  li { margin-bottom: 0.3em; }
  blockquote {
    margin: 1em 0; padding: 0.8em 1.2em; border-left: 4px solid #0066cc;
    background: #f6f8fa; color: #333; font-style: italic;
  }
  blockquote p:last-child { margin-bottom: 0; }
  code {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em; background: #f0f0f0; padding: 0.15em 0.4em; border-radius: 3px; color: #c7254e;
  }
  pre {
    margin: 1em 0; padding: 1em; background: #f6f8fa; border: 1px solid #e1e4e8;
    border-radius: 6px; overflow-x: auto; font-size: 0.9em; line-height: 1.5;
  }
  pre code { background: none; padding: 0; border-radius: 0; color: inherit; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; }
  th, td { padding: 8px 12px; border: 1px solid #d0d7de; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 700; color: #111; }
  tr:nth-child(even) { background: #fafbfc; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 2em 0; }
  img { max-width: 100%; height: auto; border-radius: 4px; margin: 1em 0; }
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
   PDF text extraction via pdfjs-dist
   ============================================ */

async function pdfToText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    if (pageText.trim()) {
      textParts.push(pageText);
    }
  }

  if (textParts.length === 0) {
    return `[This PDF contains no extractable text — it may be image-based/scanned.]`;
  }

  return textParts.join('\n\n');
}

/* ============================================
   PDF → HTML
   Extracts text per page, wraps in styled HTML
   ============================================ */

async function pdfToHtml(file: File): Promise<string> {
  const text = await pdfToText(file);
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const bodyHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
  return wrapInStyledHtml(bodyHtml, file.name.replace(/\.pdf$/i, ''));
}

/* ============================================
   PDF → Markdown
   ============================================ */

async function pdfToMarkdown(file: File): Promise<string> {
  const text = await pdfToText(file);
  // Attempt to detect headings (ALL CAPS lines, short lines)
  const lines = text.split('\n');
  const mdLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      mdLines.push('');
      continue;
    }
    // Heuristic: short all-caps lines are likely headings
    if (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      mdLines.push(`## ${trimmed}`);
    } else {
      mdLines.push(trimmed);
    }
  }

  return mdLines.join('\n');
}

/* ============================================
   PDF → DOCX
   Extracts text, builds DOCX using docx package
   ============================================ */

async function pdfToDocx(file: File): Promise<Blob> {
  const text = await pdfToText(file);
  return textToDocx(text);
}

/* ============================================
   Text/HTML/MD → DOCX generation using docx pkg
   ============================================ */

async function textToDocx(text: string): Promise<Blob> {
  const docx = await import('docx');
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  const children = paragraphs.map(
    (p) =>
      new docx.Paragraph({
        children: [new docx.TextRun({ text: p, size: 24 })],
        spacing: { after: 200 },
      })
  );

  const doc = new docx.Document({
    sections: [{ children }],
  });

  return await docx.Packer.toBlob(doc);
}

async function htmlToDocx(html: string): Promise<Blob> {
  // Convert HTML to plain text, then build DOCX
  const plainText = htmlToText(html);
  return textToDocx(plainText);
}

async function markdownToDocx(mdText: string): Promise<Blob> {
  const docx = await import('docx');
  const lines = mdText.split('\n');
  const children: InstanceType<typeof docx.Paragraph>[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const h1Match = line.match(/^#\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    const h4Match = line.match(/^####\s+(.+)/);

    if (h1Match) {
      children.push(
        new docx.Paragraph({
          children: [new docx.TextRun({ text: h1Match[1], bold: true, size: 48 })],
          heading: docx.HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );
    } else if (h2Match) {
      children.push(
        new docx.Paragraph({
          children: [new docx.TextRun({ text: h2Match[1], bold: true, size: 36 })],
          heading: docx.HeadingLevel.HEADING_2,
          spacing: { after: 160 },
        })
      );
    } else if (h3Match) {
      children.push(
        new docx.Paragraph({
          children: [new docx.TextRun({ text: h3Match[1], bold: true, size: 28 })],
          heading: docx.HeadingLevel.HEADING_3,
          spacing: { after: 120 },
        })
      );
    } else if (h4Match) {
      children.push(
        new docx.Paragraph({
          children: [new docx.TextRun({ text: h4Match[1], bold: true, size: 24 })],
          heading: docx.HeadingLevel.HEADING_4,
          spacing: { after: 100 },
        })
      );
    }
    // Unordered list
    else if (line.match(/^[-*+]\s+/)) {
      children.push(
        new docx.Paragraph({
          children: parseInlineMarkdown(docx, line.replace(/^[-*+]\s+/, '')),
          bullet: { level: 0 },
        })
      );
    }
    // Ordered list
    else if (line.match(/^\d+\.\s+/)) {
      children.push(
        new docx.Paragraph({
          children: parseInlineMarkdown(docx, line.replace(/^\d+\.\s+/, '')),
          numbering: { reference: 'default-numbering', level: 0 },
        })
      );
    }
    // Blockquote
    else if (line.startsWith('>')) {
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: line.replace(/^>\s*/, ''),
              italics: true,
              color: '555555',
              size: 24,
            }),
          ],
          indent: { left: 720 },
          border: {
            left: { style: docx.BorderStyle.SINGLE, size: 6, color: '0066cc', space: 10 },
          },
          spacing: { after: 120 },
        })
      );
    }
    // Horizontal rule
    else if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      children.push(
        new docx.Paragraph({
          children: [],
          border: {
            bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 10 },
          },
          spacing: { before: 200, after: 200 },
        })
      );
    }
    // Code block
    else if (line.startsWith('```')) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: codeLines.join('\n'),
              font: 'Courier New',
              size: 20,
            }),
          ],
          shading: { type: docx.ShadingType.SOLID, color: 'F6F8FA' },
          spacing: { before: 120, after: 120 },
        })
      );
    }
    // Empty line
    else if (line.trim() === '') {
      children.push(new docx.Paragraph({ children: [], spacing: { after: 120 } }));
    }
    // Regular paragraph
    else {
      children.push(
        new docx.Paragraph({
          children: parseInlineMarkdown(docx, line),
          spacing: { after: 160 },
        })
      );
    }

    i++;
  }

  const doc = new docx.Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: docx.LevelFormat.DECIMAL,
              text: '%1.',
              alignment: docx.AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  return await docx.Packer.toBlob(doc);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseInlineMarkdown(docx: any, text: string): any[] {
  const runs: any[] = [];
  // Regex to detect **bold**, *italic*, `code`, ~~strikethrough~~
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~|([^*`~]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      runs.push(new docx.TextRun({ text: match[2], bold: true, size: 24 }));
    } else if (match[3]) {
      // Italic
      runs.push(new docx.TextRun({ text: match[3], italics: true, size: 24 }));
    } else if (match[4]) {
      // Code
      runs.push(
        new docx.TextRun({ text: match[4], font: 'Courier New', size: 22, color: 'C7254E' })
      );
    } else if (match[5]) {
      // Strikethrough
      runs.push(new docx.TextRun({ text: match[5], strike: true, size: 24 }));
    } else if (match[6]) {
      // Plain text
      runs.push(new docx.TextRun({ text: match[6], size: 24 }));
    }
  }

  if (runs.length === 0) {
    runs.push(new docx.TextRun({ text, size: 24 }));
  }

  return runs;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ============================================
   Source → HTML conversions
   ============================================ */

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

async function docxToMarkdown(file: File): Promise<string> {
  const bodyHtml = await docxToHtml(file);
  return htmlToMarkdown(bodyHtml);
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
      default:
        return children;
    }
  }

  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}

/* ============================================
   RTF → text (basic extraction)
   ============================================ */

function rtfToText(rtf: string): string {
  // Strip RTF control words and groups, extract plain text
  let text = rtf;
  // Remove header up to first \pard
  const pardIndex = text.indexOf('\\pard');
  if (pardIndex > 0) {
    // Keep content from first \pard onwards but strip the \pard itself
    text = text.substring(pardIndex);
  }
  // Handle common RTF escapes
  text = text.replace(/\\par\b/g, '\n');
  text = text.replace(/\\tab\b/g, '\t');
  text = text.replace(/\\line\b/g, '\n');
  text = text.replace(/\\\n/g, '\n');
  text = text.replace(/\\pard[^\\]*/g, '');
  // Remove {\*\...} groups (destinations we don't care about)
  text = text.replace(/\{\\\*\\[^}]*\}/g, '');
  // Remove remaining RTF commands (\word or \wordN)
  text = text.replace(/\\[a-z]+\d*\s?/gi, '');
  // Remove braces
  text = text.replace(/[{}]/g, '');
  // Handle unicode escapes \\uN
  text = text.replace(/\\u(\d+)\??/g, (_, code) => String.fromCharCode(parseInt(code)));
  // Handle hex escapes \\'XX
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  // Clean up
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/* ============================================
   HTML → PDF via jsPDF.html()
   ============================================ */

async function renderHtmlToPdf(htmlContent: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas-pro')).default;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';

  const parser = new DOMParser();
  const parsed = parser.parseFromString(htmlContent, 'text/html');

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
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 15;

    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageContentHeight = pdfHeight - margin * 2;

    if (imgHeight <= pageContentHeight) {
      doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgWidth, imgHeight);
    } else {
      const totalPages = Math.ceil(imgHeight / pageContentHeight);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) doc.addPage();
        const sourceY = (page * pageContentHeight * canvas.width) / imgWidth;
        const sourceHeight = Math.min(
          (pageContentHeight * canvas.width) / imgWidth,
          canvas.height - sourceY
        );
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        }
        const sliceHeight = (sourceHeight * imgWidth) / canvas.width;
        doc.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgWidth, sliceHeight);
      }
    }

    return doc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

/* ============================================
   Plain text → PDF
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
   Main export — full conversion matrix
   
   Source formats: pdf, docx, md, html, htm, txt, rtf
   Each can convert to: pdf, docx, html, md, txt
   (minus converting to its own format)
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

  // Strategy: convert source → intermediate (text or HTML), then intermediate → target
  switch (sourceExt) {
    /* ---- PDF source ---- */
    case 'pdf': {
      if (targetFormat === 'txt') {
        const text = await pdfToText(file);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'html') {
        const html = await pdfToHtml(file);
        resultBlob = new Blob([html], { type: 'text/html' });
      } else if (targetFormat === 'md') {
        const md = await pdfToMarkdown(file);
        resultBlob = new Blob([md], { type: 'text/markdown' });
      } else if (targetFormat === 'docx') {
        onProgress?.(50);
        resultBlob = await pdfToDocx(file);
      } else {
        throw new Error(`Unsupported: pdf → ${targetFormat}`);
      }
      break;
    }

    /* ---- DOCX source ---- */
    case 'docx': {
      if (targetFormat === 'html') {
        const bodyHtml = await docxToHtml(file);
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        resultBlob = new Blob([styledHtml], { type: 'text/html' });
      } else if (targetFormat === 'txt') {
        const text = await docxToText(file);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'md') {
        const md = await docxToMarkdown(file);
        resultBlob = new Blob([md], { type: 'text/markdown' });
      } else if (targetFormat === 'pdf') {
        onProgress?.(40);
        const bodyHtml = await docxToHtml(file);
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        onProgress?.(60);
        resultBlob = await renderHtmlToPdf(styledHtml);
      } else {
        throw new Error(`Unsupported: docx → ${targetFormat}`);
      }
      break;
    }

    /* ---- Markdown source ---- */
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
        const bodyHtml = await markdownToHtml(mdText);
        const text = htmlToText(bodyHtml);
        resultBlob = new Blob([text], { type: 'text/plain' });
      } else if (targetFormat === 'docx') {
        onProgress?.(50);
        resultBlob = await markdownToDocx(mdText);
      } else {
        throw new Error(`Unsupported: md → ${targetFormat}`);
      }
      break;
    }

    /* ---- HTML source ---- */
    case 'html':
    case 'htm': {
      const rawHtml = await readFileAsText(file);
      if (targetFormat === 'pdf') {
        onProgress?.(40);
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
      } else if (targetFormat === 'docx') {
        onProgress?.(50);
        resultBlob = await htmlToDocx(rawHtml);
      } else {
        throw new Error(`Unsupported: html → ${targetFormat}`);
      }
      break;
    }

    /* ---- TXT source ---- */
    case 'txt': {
      const text = await readFileAsText(file);
      if (targetFormat === 'pdf') {
        resultBlob = await plainTextToPdf(text);
      } else if (targetFormat === 'html') {
        const bodyHtml = `<pre><code>${escapeHtml(text)}</code></pre>`;
        const styledHtml = wrapInStyledHtml(bodyHtml, file.name);
        resultBlob = new Blob([styledHtml], { type: 'text/html' });
      } else if (targetFormat === 'md') {
        // Plain text is valid markdown
        resultBlob = new Blob([text], { type: 'text/markdown' });
      } else if (targetFormat === 'docx') {
        onProgress?.(50);
        resultBlob = await textToDocx(text);
      } else {
        throw new Error(`Unsupported: txt → ${targetFormat}`);
      }
      break;
    }

    /* ---- RTF source ---- */
    case 'rtf': {
      const rtfContent = await readFileAsText(file);
      const plainText = rtfToText(rtfContent);
      if (targetFormat === 'txt') {
        resultBlob = new Blob([plainText], { type: 'text/plain' });
      } else if (targetFormat === 'html') {
        const bodyHtml = plainText
          .split(/\n\n+/)
          .filter(Boolean)
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('\n');
        resultBlob = new Blob([wrapInStyledHtml(bodyHtml, file.name)], { type: 'text/html' });
      } else if (targetFormat === 'md') {
        resultBlob = new Blob([plainText], { type: 'text/markdown' });
      } else if (targetFormat === 'pdf') {
        onProgress?.(50);
        resultBlob = await plainTextToPdf(plainText);
      } else if (targetFormat === 'docx') {
        onProgress?.(50);
        resultBlob = await textToDocx(plainText);
      } else {
        throw new Error(`Unsupported: rtf → ${targetFormat}`);
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
