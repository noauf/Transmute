import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

/**
 * EPUB converter.
 * EPUB is a ZIP file containing XHTML content + OPF metadata.
 * We use JSZip (already installed) to read/write EPUB archives.
 *
 * Supported routes:
 *   epub → txt, html, md, pdf
 *   txt, html, md → epub
 */

const EPUB_EXTENSIONS = new Set(['epub']);

export function isEbookConversion(sourceExt: string, targetFormat: string): boolean {
  return EPUB_EXTENSIONS.has(sourceExt) || EPUB_EXTENSIONS.has(targetFormat);
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Read EPUB ── */

async function extractEpubContent(buffer: ArrayBuffer): Promise<{ title: string; htmlChapters: string[] }> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  let title = 'Untitled';
  const htmlChapters: string[] = [];

  // Find the OPF file (rootfile)
  let opfPath = '';
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (containerXml) {
    const match = containerXml.match(/full-path="([^"]+)"/);
    if (match) opfPath = match[1];
  }

  // Parse OPF for spine order
  if (opfPath) {
    const opfContent = await zip.file(opfPath)?.async('string');
    if (opfContent) {
      // Get title
      const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch) title = titleMatch[1];

      // Get manifest items
      const manifest: Record<string, string> = {};
      const itemRegex = /<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*media-type="([^"]*)"[^>]*\/?>/gi;
      let itemMatch;
      while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
        manifest[itemMatch[1]] = itemMatch[2];
      }
      // Also handle reversed attribute order
      const itemRegex2 = /<item[^>]*href="([^"]*)"[^>]*id="([^"]*)"[^>]*media-type="([^"]*)"[^>]*\/?>/gi;
      while ((itemMatch = itemRegex2.exec(opfContent)) !== null) {
        manifest[itemMatch[2]] = itemMatch[1];
      }

      // Get spine order
      const spineIds: string[] = [];
      const spineRegex = /<itemref[^>]*idref="([^"]*)"[^>]*\/?>/gi;
      let spineMatch;
      while ((spineMatch = spineRegex.exec(opfContent)) !== null) {
        spineIds.push(spineMatch[1]);
      }

      // Resolve paths relative to OPF directory
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

      for (const id of spineIds) {
        const href = manifest[id];
        if (!href) continue;
        const fullPath = opfDir + href;
        const content = await zip.file(fullPath)?.async('string');
        if (content) {
          // Extract body content
          const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          htmlChapters.push(bodyMatch ? bodyMatch[1] : content);
        }
      }
    }
  }

  // Fallback: if no chapters found, scan for any html/xhtml files
  if (htmlChapters.length === 0) {
    const htmlFiles = Object.keys(zip.files)
      .filter(f => /\.(x?html?)$/i.test(f))
      .sort();
    for (const f of htmlFiles) {
      const content = await zip.file(f)?.async('string');
      if (content) {
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        htmlChapters.push(bodyMatch ? bodyMatch[1] : content);
      }
    }
  }

  return { title, htmlChapters };
}

/* ── Write EPUB ── */

async function createEpubFromHtml(title: string, htmlContent: string): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const uid = `transmute-${Date.now()}`;

  // mimetype (must be first, uncompressed — JSZip handles this)
  zip.file('mimetype', 'application/epub+zip');

  // META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // OEBPS/content.opf
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`);

  // Navigation document
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol><li><a href="chapter1.xhtml">${escapeHtml(title)}</a></li></ol>
  </nav>
</body>
</html>`);

  // Chapter content
  zip.file('OEBPS/chapter1.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeHtml(title)}</title>
<style>
  body { font-family: serif; line-height: 1.6; margin: 1em; }
  h1, h2, h3 { margin-top: 1.5em; }
  p { margin: 0.5em 0; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });

  return blob;
}

/* ── Main converter ── */

export async function convertEbook(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(10);

  const sourceExt = getExtension(file.name);
  let resultBlob: Blob;

  if (sourceExt === 'epub') {
    // EPUB → other format
    const buffer = await readFileAsArrayBuffer(file);
    onProgress?.(30);

    const { title, htmlChapters } = await extractEpubContent(buffer);
    const fullHtml = htmlChapters.join('\n<hr/>\n');
    onProgress?.(60);

    switch (targetFormat) {
      case 'txt': {
        const text = stripHtmlTags(fullHtml);
        resultBlob = new Blob([text], { type: getMimeType('txt') });
        break;
      }
      case 'html': {
        const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:serif;line-height:1.7;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a1a}h1,h2,h3{margin-top:1.5em}</style>
</head><body><h1>${escapeHtml(title)}</h1>${fullHtml}</body></html>`;
        resultBlob = new Blob([styledHtml], { type: getMimeType('html') });
        break;
      }
      case 'md': {
        const md = `# ${title}\n\n` + htmlToMarkdown(fullHtml);
        resultBlob = new Blob([md], { type: getMimeType('md') });
        break;
      }
      case 'pdf': {
        // Generate HTML then render to PDF via jspdf
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const plainText = stripHtmlTags(fullHtml);
        const lines = doc.splitTextToSize(plainText, 170);
        const pageHeight = 280;
        let y = 20;

        // Title
        doc.setFontSize(18);
        doc.text(title, 20, y);
        y += 12;
        doc.setFontSize(11);

        for (const line of lines) {
          if (y > pageHeight) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 20, y);
          y += 6;
        }

        resultBlob = doc.output('blob');
        break;
      }
      default:
        throw new Error(`Unsupported: epub → ${targetFormat}`);
    }
  } else {
    // Other format → EPUB
    const text = await readFileAsText(file);
    onProgress?.(30);

    const title = file.name.replace(/\.[^.]+$/, '');
    let htmlContent: string;

    switch (sourceExt) {
      case 'txt': {
        htmlContent = text
          .split(/\n\n+/)
          .filter(Boolean)
          .map(p => `<p>${escapeHtml(p)}</p>`)
          .join('\n');
        break;
      }
      case 'html':
      case 'htm': {
        // Extract body if full document
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        htmlContent = bodyMatch ? bodyMatch[1] : text;
        break;
      }
      case 'md': {
        const { marked } = await import('marked');
        htmlContent = await marked.parse(text, { breaks: true, gfm: true });
        break;
      }
      default:
        throw new Error(`Unsupported: ${sourceExt} → epub`);
    }

    onProgress?.(60);
    resultBlob = await createEpubFromHtml(title, htmlContent);
  }

  onProgress?.(100);

  return {
    blob: resultBlob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}
