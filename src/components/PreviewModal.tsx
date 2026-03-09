'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedFile } from '@/types';
import { formatFileSize } from '@/lib/utils';

interface PreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  onDownload: (file: UploadedFile) => void;
}

/* ─── Format classification ─── */

/** Image formats for <img> */
const IMAGE_FORMATS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg', 'ico', 'tiff', 'tif',
  'heic', 'heif', 'psd',
]);

/** Audio formats for <audio> */
const AUDIO_FORMATS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus', 'wma']);

/** Video formats for <video> */
const VIDEO_FORMATS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

/** Formats rendered via iframe (PDF natively, HTML as-is) */
const IFRAME_FORMATS = new Set(['pdf', 'html', 'htm']);

type PreviewKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'iframe'      // pdf, html
  | 'markdown'    // .md → rendered HTML
  | 'json'        // syntax-highlighted JSON
  | 'csv'         // table view via papaparse
  | 'tsv'         // table view via papaparse
  | 'xml'         // syntax-highlighted XML
  | 'yaml'        // syntax-highlighted YAML
  | 'toml'        // syntax-highlighted TOML
  | 'docx'        // mammoth → HTML
  | 'rtf'         // strip RTF → text
  | 'spreadsheet' // xlsx/xls/ods → table via SheetJS
  | 'pptx'        // extract slides text
  | 'epub'        // extract content from epub zip
  | 'font'        // font preview via opentype.js
  | 'plaintext'   // .txt, .ini, .env, .properties, .ndjson, .jsonl, .sql, etc.
  | 'none';

const PLAINTEXT_FORMATS = new Set([
  'txt', 'ini', 'env', 'properties', 'ndjson', 'jsonl', 'sql', 'rst', 'tex', 'log',
]);

function getPreviewKind(format: string): PreviewKind {
  if (IMAGE_FORMATS.has(format)) return 'image';
  if (AUDIO_FORMATS.has(format)) return 'audio';
  if (VIDEO_FORMATS.has(format)) return 'video';
  if (IFRAME_FORMATS.has(format)) return 'iframe';
  if (format === 'md') return 'markdown';
  if (format === 'json') return 'json';
  if (format === 'csv') return 'csv';
  if (format === 'tsv') return 'tsv';
  if (format === 'xml') return 'xml';
  if (format === 'yaml' || format === 'yml') return 'yaml';
  if (format === 'toml') return 'toml';
  if (format === 'docx') return 'docx';
  if (format === 'rtf') return 'rtf';
  if (format === 'xlsx' || format === 'xls' || format === 'ods') return 'spreadsheet';
  if (format === 'pptx') return 'pptx';
  if (format === 'epub') return 'epub';
  if (format === 'ttf' || format === 'otf' || format === 'woff' || format === 'woff2') return 'font';
  if (PLAINTEXT_FORMATS.has(format)) return 'plaintext';
  return 'none';
}

/* ─── Syntax highlighting helpers (no external deps) ─── */

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightJson(raw: string): string {
  try {
    // Pretty-print first
    const obj = JSON.parse(raw);
    const pretty = JSON.stringify(obj, null, 2);
    // Tokenize with regex
    return pretty.replace(
      /("(?:\\.|[^"\\])*")\s*:/g,  // keys
      '<span style="color:#9333ea">$1</span>:'
    ).replace(
      /:\s*("(?:\\.|[^"\\])*")/g,  // string values
      ': <span style="color:#059669">$1</span>'
    ).replace(
      /:\s*(\d+\.?\d*)/g,          // numbers
      ': <span style="color:#d97706">$1</span>'
    ).replace(
      /:\s*(true|false)/g,         // booleans
      ': <span style="color:#2563eb">$1</span>'
    ).replace(
      /:\s*(null)/g,               // null
      ': <span style="color:#9ca3af">$1</span>'
    );
  } catch {
    return escapeHtml(raw);
  }
}

function highlightXml(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    // Tags: <tagName ... >
    .replace(/&lt;(\/?)([\w:.-]+)/g, '&lt;$1<span style="color:#9333ea">$2</span>')
    // Attributes: key="value"
    .replace(/([\w:.-]+)=&quot;([^&]*)&quot;/g,
      '<span style="color:#d97706">$1</span>=&quot;<span style="color:#059669">$2</span>&quot;')
    // Comments
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#9ca3af">$1</span>');
}

function highlightYaml(raw: string): string {
  return escapeHtml(raw)
    .split('\n')
    .map(line => {
      // Comments
      if (/^\s*#/.test(line)) return `<span style="color:#9ca3af">${line}</span>`;
      // Key: value
      const match = line.match(/^(\s*)([\w.-]+)(\s*:\s*)(.*)/);
      if (match) {
        const [, indent, key, colon, val] = match;
        let valHtml = val;
        if (/^(true|false)$/i.test(val)) valHtml = `<span style="color:#2563eb">${val}</span>`;
        else if (/^-?\d+\.?\d*$/.test(val)) valHtml = `<span style="color:#d97706">${val}</span>`;
        else if (/^["'].*["']$/.test(val)) valHtml = `<span style="color:#059669">${val}</span>`;
        else if (val === 'null' || val === '~') valHtml = `<span style="color:#9ca3af">${val}</span>`;
        else if (val) valHtml = `<span style="color:#059669">${val}</span>`;
        return `${indent}<span style="color:#9333ea">${key}</span>${colon}${valHtml}`;
      }
      // List items
      if (/^\s*-\s/.test(line)) {
        return line.replace(/^(\s*-\s+)(.*)/, '$1<span style="color:#059669">$2</span>');
      }
      return line;
    })
    .join('\n');
}

function highlightToml(raw: string): string {
  return escapeHtml(raw)
    .split('\n')
    .map(line => {
      // Comments
      if (/^\s*#/.test(line)) return `<span style="color:#9ca3af">${line}</span>`;
      // Section headers [section]
      if (/^\s*\[/.test(line)) return `<span style="color:#2563eb;font-weight:600">${line}</span>`;
      // Key = value
      const match = line.match(/^(\s*)([\w.-]+)(\s*=\s*)(.*)/);
      if (match) {
        const [, indent, key, eq, val] = match;
        let valHtml = val;
        if (/^(true|false)$/i.test(val)) valHtml = `<span style="color:#2563eb">${val}</span>`;
        else if (/^-?\d+\.?\d*$/.test(val)) valHtml = `<span style="color:#d97706">${val}</span>`;
        else if (/^&quot;.*&quot;$/.test(val)) valHtml = `<span style="color:#059669">${val}</span>`;
        else if (val) valHtml = `<span style="color:#059669">${val}</span>`;
        return `${indent}<span style="color:#9333ea">${key}</span>${eq}${valHtml}`;
      }
      return line;
    })
    .join('\n');
}

function stripRtf(raw: string): string {
  // Basic RTF stripping: remove RTF control words and groups, extract text
  let result = raw
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\[^{}]*\}/g, '')     // remove groups like {\fonttbl ...}
    .replace(/\\[a-z]+\d*\s?/gi, '')  // remove control words like \b, \fs24
    .replace(/[{}]/g, '')             // remove remaining braces
    .replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
  // Clean up excessive newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

/* ─── CSV/TSV table renderer ─── */

function CsvTable({ text, delimiter }: { text: string; delimiter: string }) {
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);

  useEffect(() => {
    // Lazy-load papaparse
    import('papaparse').then((Papa) => {
      const result = Papa.default.parse(text, {
        delimiter: delimiter === '\t' ? '\t' : delimiter,
        skipEmptyLines: true,
      });
      setRows(result.data as string[][]);
    });
  }, [text, delimiter]);

  if (rows.length === 0) return <div className="p-4 text-text-light font-mono text-sm">Parsing...</div>;

  const headerRow = hasHeader ? rows[0] : null;
  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const maxCols = Math.max(...rows.map(r => r.length));

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[11px] text-text-light">{rows.length} rows x {maxCols} cols</span>
        <button
          className="font-mono text-[11px] px-2 py-0.5 rounded border border-border-soft text-text-mid hover:bg-bg-warm transition-colors"
          onClick={() => setHasHeader(!hasHeader)}
        >
          {hasHeader ? 'Headers: ON' : 'Headers: OFF'}
        </button>
      </div>
      <div className="overflow-auto max-h-[65vh] rounded-xl border border-border-soft">
        <table className="w-full border-collapse bg-white text-[13px]">
          {headerRow && (
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-mono text-[11px] font-bold text-text-light bg-bg-warm border-b border-border-soft w-10">#</th>
                {headerRow.map((cell, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-mono text-[11px] font-bold text-purple bg-bg-warm border-b border-border-soft whitespace-nowrap"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.slice(0, 500).map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-bg-cream/40'}>
                <td className="px-3 py-1.5 font-mono text-[11px] text-text-light border-b border-border-soft/50 w-10">{ri + 1}</td>
                {Array.from({ length: maxCols }, (_, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-1.5 font-mono text-[12px] text-text-dark border-b border-border-soft/50 whitespace-nowrap max-w-[300px] truncate"
                    title={row[ci] || ''}
                  >
                    {row[ci] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {bodyRows.length > 500 && (
          <div className="text-center py-2 font-mono text-[11px] text-text-light bg-bg-warm border-t border-border-soft">
            Showing 500 of {bodyRows.length} rows
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Rendered HTML viewer (for Markdown, DOCX) ─── */

function RenderedHtmlFrame({ html, title }: { html: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Build a styled HTML page inside the iframe
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.7;
      color: #2d1f14;
      padding: 24px 32px;
      margin: 0;
      max-width: 720px;
      font-size: 15px;
      background: #fffcf8;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: Georgia, 'Times New Roman', serif;
      color: #2d1f14;
      margin: 1.4em 0 0.6em;
      line-height: 1.3;
    }
    h1 { font-size: 1.8em; border-bottom: 2px solid rgba(180,140,100,0.15); padding-bottom: 8px; }
    h2 { font-size: 1.4em; border-bottom: 1px solid rgba(180,140,100,0.1); padding-bottom: 6px; }
    h3 { font-size: 1.2em; }
    p { margin: 0.8em 0; }
    a { color: #9333ea; text-decoration: underline; }
    code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(180,140,100,0.08);
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre {
      background: #2d1f14;
      color: #f5e6d3;
      padding: 16px 20px;
      border-radius: 10px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    blockquote {
      border-left: 3px solid #a78bfa;
      margin: 1em 0;
      padding: 8px 16px;
      background: rgba(167,139,250,0.06);
      color: #7a6552;
    }
    ul, ol { padding-left: 24px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid rgba(180,140,100,0.15); padding: 8px 12px; text-align: left; }
    th { background: rgba(180,140,100,0.06); font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    hr { border: none; height: 1px; background: rgba(180,140,100,0.15); margin: 1.5em 0; }
  </style>
</head>
<body>${html}</body>
</html>`);
    doc.close();
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-[70vh] border-none"
      title={title}
      sandbox="allow-same-origin"
    />
  );
}

/* ─── Syntax-highlighted code block ─── */

function HighlightedCode({ html, label }: { html: string; label: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest rounded bg-purple/10 text-purple border border-purple/15">
          {label}
        </span>
      </div>
      <pre
        className="w-full p-5 bg-white rounded-xl border border-border-soft font-mono text-[13px] leading-relaxed overflow-auto max-h-[65vh] whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ─── Main component ─── */

export function PreviewModal({ file, onClose, onDownload }: PreviewModalProps) {
  const [renderedContent, setRenderedContent] = useState<{
    kind: 'html' | 'highlighted' | 'table' | 'spreadsheet' | 'plaintext' | 'font';
    html?: string;
    text?: string;
    label?: string;
    delimiter?: string;
    sheetData?: { headers: string[]; rows: string[][] };
    fontDataUrl?: string;
  } | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  const targetFormat = file?.targetFormat || '';
  const previewKind = getPreviewKind(targetFormat);

  // Load preview content
  useEffect(() => {
    if (!file?.convertedBlob || !file?.targetFormat) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRenderedContent(null);

    const kind = getPreviewKind(file.targetFormat);

    if (kind === 'image' || kind === 'iframe' || kind === 'audio' || kind === 'video') {
      const url = URL.createObjectURL(file.convertedBlob);
      setBlobUrl(url);
      setLoading(false);
    } else if (kind === 'docx') {
      // Convert DOCX blob to HTML via mammoth (lazy loaded)
      import('mammoth').then(async (mammoth) => {
        if (cancelled) return;
        try {
          const arrayBuffer = await file.convertedBlob!.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!cancelled) {
            setRenderedContent({ kind: 'html', html: result.value });
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setRenderedContent({ kind: 'plaintext', text: '[Failed to parse DOCX for preview]' });
            setLoading(false);
          }
        }
      });
    } else if (kind === 'spreadsheet') {
      // Parse xlsx/xls/ods via SheetJS and render as table
      import('xlsx').then(async (XLSX) => {
        if (cancelled) return;
        try {
          const buffer = await file.convertedBlob!.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          const headers = (jsonData[0] || []).map(String);
          const rows = jsonData.slice(1).map(row => row.map(String));
          if (!cancelled) {
            setRenderedContent({ kind: 'spreadsheet', sheetData: { headers, rows } });
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setRenderedContent({ kind: 'plaintext', text: '[Failed to parse spreadsheet for preview]' });
            setLoading(false);
          }
        }
      });
    } else if (kind === 'pptx') {
      // Extract slide text from PPTX via jszip
      import('jszip').then(async (JSZipModule) => {
        if (cancelled) return;
        try {
          const JSZip = JSZipModule.default;
          const buffer = await file.convertedBlob!.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);

          const slideFiles = Object.keys(zip.files)
            .filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
            .sort((a, b) => {
              const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
              const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
              return numA - numB;
            });

          const slidesHtml: string[] = [];
          for (const slideFile of slideFiles) {
            const content = await zip.file(slideFile)?.async('string');
            if (!content) continue;
            const texts: string[] = [];
            const textRegex = /<a:t>([^<]*)<\/a:t>/g;
            let match;
            while ((match = textRegex.exec(content)) !== null) {
              if (match[1].trim()) texts.push(escapeHtml(match[1]));
            }
            const slideNum = slideFile.match(/slide(\d+)/)?.[1] || '?';
            slidesHtml.push(`<div style="margin:1.5em 0;padding:1em 1.5em;border:1px solid rgba(180,140,100,0.15);border-radius:12px;background:white"><h3 style="margin:0 0 0.5em;color:#9333ea;font-size:14px;font-family:monospace">Slide ${slideNum}</h3><p style="margin:0;line-height:1.6;color:#2d1f14">${texts.join('<br/>')}</p></div>`);
          }

          if (!cancelled) {
            const html = slidesHtml.length > 0
              ? `<h2 style="font-family:Georgia,serif;color:#2d1f14;margin-bottom:0.5em">${escapeHtml(file.convertedName || file.name)}</h2><p style="color:#7a6552;font-size:13px;font-family:monospace">${slideFiles.length} slides</p>${slidesHtml.join('')}`
              : '<p style="color:#7a6552">No slide content found in this presentation.</p>';
            setRenderedContent({ kind: 'html', html });
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setRenderedContent({ kind: 'plaintext', text: '[Failed to parse PPTX for preview]' });
            setLoading(false);
          }
        }
      });
    } else if (kind === 'epub') {
      // Extract EPUB content via jszip
      import('jszip').then(async (JSZipModule) => {
        if (cancelled) return;
        try {
          const JSZip = JSZipModule.default;
          const buffer = await file.convertedBlob!.arrayBuffer();
          const zip = await JSZip.loadAsync(buffer);

          // Find XHTML content files in the EPUB
          const htmlFiles = Object.keys(zip.files)
            .filter(f => /\.(xhtml|html|htm)$/i.test(f) && !f.includes('nav') && !f.includes('toc'))
            .sort();

          const contentParts: string[] = [];
          for (const htmlFile of htmlFiles.slice(0, 20)) { // Limit to 20 chapters
            const content = await zip.file(htmlFile)?.async('string');
            if (!content) continue;
            // Extract body content
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
              contentParts.push(bodyMatch[1]);
            }
          }

          if (!cancelled) {
            const html = contentParts.length > 0
              ? contentParts.join('<hr style="border:none;height:1px;background:rgba(180,140,100,0.15);margin:2em 0"/>')
              : '<p style="color:#7a6552">No readable content found in this EPUB.</p>';
            setRenderedContent({ kind: 'html', html });
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setRenderedContent({ kind: 'plaintext', text: '[Failed to parse EPUB for preview]' });
            setLoading(false);
          }
        }
      });
    } else if (kind === 'font') {
      // Preview font using opentype.js — render sample glyphs to canvas
      import('opentype.js').then(async (opentype) => {
        if (cancelled) return;
        try {
          const buffer = await file.convertedBlob!.arrayBuffer();
          const font = opentype.parse(buffer);

          // Create a canvas with sample text
          const canvas = document.createElement('canvas');
          const scale = 2; // Retina
          canvas.width = 700 * scale;
          canvas.height = 500 * scale;
          const ctx = canvas.getContext('2d')!;
          ctx.scale(scale, scale);

          // Background
          ctx.fillStyle = '#fffcf8';
          ctx.fillRect(0, 0, 700, 500);

          // Font name
          ctx.fillStyle = '#2d1f14';
          ctx.font = '14px monospace';
          ctx.fillText(`${font.names.fontFamily?.en || 'Font'} — ${font.names.fontSubfamily?.en || ''}`, 24, 32);

          // Draw sample text at various sizes
          const samples = [
            { text: 'ABCDEFGHIJKLM', size: 48, y: 90 },
            { text: 'NOPQRSTUVWXYZ', size: 48, y: 145 },
            { text: 'abcdefghijklm', size: 44, y: 200 },
            { text: 'nopqrstuvwxyz', size: 44, y: 250 },
            { text: '0123456789', size: 44, y: 305 },
            { text: 'The quick brown fox jumps', size: 32, y: 360 },
            { text: 'over the lazy dog. 0123456789', size: 24, y: 405 },
            { text: '!@#$%^&*()_+-=[]{}|;:\'",.<>?', size: 24, y: 445 },
          ];

          for (const sample of samples) {
            const path = font.getPath(sample.text, 24, sample.y, sample.size);
            path.fill = '#2d1f14';
            path.draw(ctx);
          }

          const dataUrl = canvas.toDataURL('image/png');
          if (!cancelled) {
            setRenderedContent({ kind: 'font', fontDataUrl: dataUrl, label: font.names.fontFamily?.en || 'Font' });
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setRenderedContent({ kind: 'plaintext', text: '[Failed to parse font for preview]' });
            setLoading(false);
          }
        }
      });
    } else if (kind === 'markdown') {
      // Render Markdown → HTML via marked
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (cancelled) return;
        try {
          const { marked } = await import('marked');
          const raw = e.target?.result as string;
          const html = await marked.parse(raw, { breaks: true, gfm: true });
          if (!cancelled) {
            setRenderedContent({ kind: 'html', html });
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setRenderedContent({ kind: 'plaintext', text: e.target?.result as string });
            setLoading(false);
          }
        }
      };
      reader.onerror = () => {
        if (!cancelled) {
          setRenderedContent({ kind: 'plaintext', text: '[Failed to read file]' });
          setLoading(false);
        }
      };
      reader.readAsText(file.convertedBlob);
    } else if (kind === 'json' || kind === 'xml' || kind === 'yaml' || kind === 'toml' || kind === 'rtf' || kind === 'csv' || kind === 'tsv' || kind === 'plaintext') {
      // Read as text, then process
      const reader = new FileReader();
      reader.onload = (e) => {
        if (cancelled) return;
        const raw = e.target?.result as string;

        switch (kind) {
          case 'json':
            setRenderedContent({ kind: 'highlighted', html: highlightJson(raw), label: 'JSON' });
            break;
          case 'xml':
            setRenderedContent({ kind: 'highlighted', html: highlightXml(raw), label: 'XML' });
            break;
          case 'yaml':
            setRenderedContent({ kind: 'highlighted', html: highlightYaml(raw), label: 'YAML' });
            break;
          case 'toml':
            setRenderedContent({ kind: 'highlighted', html: highlightToml(raw), label: 'TOML' });
            break;
          case 'rtf':
            setRenderedContent({ kind: 'plaintext', text: stripRtf(raw) });
            break;
          case 'csv':
            setRenderedContent({ kind: 'table', text: raw, delimiter: ',' });
            break;
          case 'tsv':
            setRenderedContent({ kind: 'table', text: raw, delimiter: '\t' });
            break;
          default:
            setRenderedContent({ kind: 'plaintext', text: raw });
        }
        setLoading(false);
      };
      reader.onerror = () => {
        if (!cancelled) {
          setRenderedContent({ kind: 'plaintext', text: '[Failed to read file content]' });
          setLoading(false);
        }
      };
      reader.readAsText(file.convertedBlob);
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [file?.convertedBlob, file?.targetFormat]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  if (!file) return null;

  const convertedSize = file.convertedBlob ? formatFileSize(file.convertedBlob.size) : '';

  /* ─── Format label + color for the badge ─── */
  const kindBadge: Record<string, { label: string; color: string }> = {
    markdown: { label: 'Rendered', color: 'purple' },
    json: { label: 'Highlighted', color: 'orange' },
    csv: { label: 'Table', color: 'blue' },
    tsv: { label: 'Table', color: 'blue' },
    xml: { label: 'Highlighted', color: 'teal' },
    yaml: { label: 'Highlighted', color: 'teal' },
    toml: { label: 'Highlighted', color: 'teal' },
    docx: { label: 'Rendered', color: 'purple' },
    spreadsheet: { label: 'Table', color: 'mint' },
    pptx: { label: 'Slides', color: 'orange' },
    epub: { label: 'Rendered', color: 'purple' },
    font: { label: 'Glyphs', color: 'teal' },
  };
  const badge = kindBadge[previewKind];

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-border-soft shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft bg-bg-cream/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-mint/12 text-mint rounded-lg border border-mint/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider">Preview</span>
                </div>
                {badge && (
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border
                      ${badge.color === 'purple' ? 'bg-purple/10 text-purple border-purple/15' : ''}
                      ${badge.color === 'orange' ? 'bg-orange/10 text-orange border-orange/15' : ''}
                      ${badge.color === 'blue' ? 'bg-blue/10 text-blue border-blue/15' : ''}
                      ${badge.color === 'teal' ? 'bg-teal/10 text-teal border-teal/15' : ''}
                      ${badge.color === 'mint' ? 'bg-mint/10 text-mint border-mint/15' : ''}
                    `}
                  >
                    {badge.label}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-dark truncate" title={file.convertedName || ''}>
                    {file.convertedName || file.name}
                  </p>
                  <p className="font-mono text-[11px] text-text-light">
                    .{file.targetFormat} {convertedSize ? `/ ${convertedSize}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold text-white bg-mint border-none rounded-lg cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(52,211,153,0.3)] transition-all"
                  onClick={() => onDownload(file)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download
                </button>
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer text-text-light hover:text-text-dark hover:bg-bg-warm transition-all"
                  onClick={onClose}
                  aria-label="Close preview"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-bg-warm/30">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-text-light">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    <span className="font-mono text-xs text-text-light">Loading preview...</span>
                  </div>
                </div>
              ) : previewKind === 'image' && blobUrl ? (
                <div className="flex items-center justify-center p-6 min-h-[300px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blobUrl}
                    alt={file.convertedName || 'Preview'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                  />
                </div>
              ) : previewKind === 'iframe' && blobUrl ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-[70vh] border-none"
                  title="File preview"
                  sandbox="allow-same-origin"
                />
              ) : previewKind === 'audio' && blobUrl ? (
                <div className="flex flex-col items-center justify-center gap-6 p-10 min-h-[250px]">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-purple/10 border border-purple/20">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <audio controls src={blobUrl} className="w-full max-w-md" preload="metadata">
                    Your browser does not support audio playback.
                  </audio>
                  <p className="font-mono text-xs text-text-light">
                    {file.convertedName}
                  </p>
                </div>
              ) : previewKind === 'video' && blobUrl ? (
                <div className="flex items-center justify-center p-4">
                  <video
                    controls
                    src={blobUrl}
                    className="max-w-full max-h-[70vh] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : renderedContent?.kind === 'html' && renderedContent.html ? (
                <RenderedHtmlFrame html={renderedContent.html} title={file.convertedName || 'Preview'} />
              ) : renderedContent?.kind === 'highlighted' && renderedContent.html ? (
                <HighlightedCode html={renderedContent.html} label={renderedContent.label || ''} />
              ) : renderedContent?.kind === 'table' && renderedContent.text ? (
                <CsvTable text={renderedContent.text} delimiter={renderedContent.delimiter || ','} />
              ) : renderedContent?.kind === 'spreadsheet' && renderedContent.sheetData ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest rounded bg-mint/10 text-mint border border-mint/15">
                      Spreadsheet
                    </span>
                    <span className="font-mono text-[11px] text-text-light">
                      {renderedContent.sheetData.rows.length} rows x {renderedContent.sheetData.headers.length} cols
                    </span>
                  </div>
                  <div className="overflow-auto max-h-[65vh] rounded-xl border border-border-soft">
                    <table className="w-full border-collapse bg-white text-[13px]">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left font-mono text-[11px] font-bold text-text-light bg-bg-warm border-b border-border-soft w-10">#</th>
                          {renderedContent.sheetData.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-mono text-[11px] font-bold text-purple bg-bg-warm border-b border-border-soft whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {renderedContent.sheetData.rows.slice(0, 500).map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-bg-cream/40'}>
                            <td className="px-3 py-1.5 font-mono text-[11px] text-text-light border-b border-border-soft/50 w-10">{ri + 1}</td>
                            {renderedContent.sheetData!.headers.map((_, ci) => (
                              <td key={ci} className="px-3 py-1.5 font-mono text-[12px] text-text-dark border-b border-border-soft/50 whitespace-nowrap max-w-[300px] truncate" title={row[ci] || ''}>
                                {row[ci] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {renderedContent.sheetData.rows.length > 500 && (
                      <div className="text-center py-2 font-mono text-[11px] text-text-light bg-bg-warm border-t border-border-soft">
                        Showing 500 of {renderedContent.sheetData.rows.length} rows
                      </div>
                    )}
                  </div>
                </div>
              ) : renderedContent?.kind === 'font' && renderedContent.fontDataUrl ? (
                <div className="flex flex-col items-center justify-center p-6 min-h-[300px] gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest rounded bg-teal/10 text-teal border border-teal/15">
                    {renderedContent.label}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={renderedContent.fontDataUrl}
                    alt="Font preview"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                  />
                </div>
              ) : renderedContent?.kind === 'plaintext' && renderedContent.text !== undefined ? (
                <div className="p-4">
                  <pre className="w-full p-5 bg-white rounded-xl border border-border-soft font-mono text-[13px] leading-relaxed text-text-dark overflow-auto max-h-[65vh] whitespace-pre-wrap break-words">
                    {renderedContent.text.length > 100000
                      ? renderedContent.text.slice(0, 100000) + '\n\n... [truncated — file too large for preview]'
                      : renderedContent.text}
                  </pre>
                </div>
              ) : (
                /* No preview available */
                <div className="flex flex-col items-center justify-center gap-4 p-10 min-h-[250px]">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-bg-warm border border-border-soft">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-light">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-text-dark">
                      Preview not available for .{file.targetFormat} files
                    </p>
                    <p className="text-xs text-text-light mt-1">
                      Download the file to view it in its native application
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-white bg-mint border-none rounded-xl cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(52,211,153,0.3)] transition-all"
                    onClick={() => onDownload(file)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download .{file.targetFormat}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
