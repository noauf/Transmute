import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

/**
 * Spreadsheet converter using SheetJS (xlsx).
 * Handles xlsx, xls, ods → csv, json, tsv, xml, yaml, toml, ods, xlsx, html, txt
 * Also handles csv/json/tsv → xlsx and similar data-to-spreadsheet routes.
 */

const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'ods']);

/** Check if this conversion involves a spreadsheet format */
export function isSpreadsheetConversion(sourceExt: string, targetFormat: string): boolean {
  return SPREADSHEET_EXTENSIONS.has(sourceExt) || SPREADSHEET_EXTENSIONS.has(targetFormat);
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function convertSpreadsheet(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(10);

  // Lazy-load SheetJS
  const XLSX = await import('xlsx');
  onProgress?.(20);

  const sourceExt = getExtension(file.name);
  let workbook: ReturnType<typeof XLSX.read>;

  // Parse the source file into a workbook
  if (SPREADSHEET_EXTENSIONS.has(sourceExt)) {
    // Binary spreadsheet format — read as ArrayBuffer
    const buffer = await readFileAsArrayBuffer(file);
    workbook = XLSX.read(buffer, { type: 'array' });
  } else if (sourceExt === 'csv') {
    const text = await readFileAsText(file);
    workbook = XLSX.read(text, { type: 'string' });
  } else if (sourceExt === 'tsv') {
    const text = await readFileAsText(file);
    workbook = XLSX.read(text, { type: 'string', FS: '\t' });
  } else if (sourceExt === 'json') {
    const text = await readFileAsText(file);
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(arr);
    XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');
  } else if (sourceExt === 'xml') {
    const text = await readFileAsText(file);
    // Try parsing as SpreadsheetML, fallback to generic
    try {
      workbook = XLSX.read(text, { type: 'string' });
    } catch {
      // Wrap raw XML as single-cell sheet
      workbook = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['XML Content'], [text]]);
      XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');
    }
  } else if (sourceExt === 'yaml' || sourceExt === 'yml') {
    const yaml = (await import('js-yaml')).default;
    const text = await readFileAsText(file);
    const data = yaml.load(text);
    const arr = Array.isArray(data) ? data : [data];
    workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(arr as object[]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');
  } else if (sourceExt === 'toml') {
    const TOML = await import('smol-toml');
    const text = await readFileAsText(file);
    const data = TOML.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(arr as object[]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');
  } else {
    throw new Error(`Unsupported source format for spreadsheet conversion: ${sourceExt}`);
  }

  onProgress?.(60);

  // Convert workbook to target format
  let blob: Blob;
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  switch (targetFormat) {
    case 'xlsx': {
      const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([out], { type: getMimeType('xlsx') });
      break;
    }
    case 'xls': {
      const out = XLSX.write(workbook, { bookType: 'xls', type: 'array' });
      blob = new Blob([out], { type: getMimeType('xls') });
      break;
    }
    case 'ods': {
      const out = XLSX.write(workbook, { bookType: 'ods', type: 'array' });
      blob = new Blob([out], { type: getMimeType('ods') });
      break;
    }
    case 'csv': {
      const csvText = XLSX.utils.sheet_to_csv(firstSheet);
      blob = new Blob([csvText], { type: getMimeType('csv') });
      break;
    }
    case 'tsv': {
      const tsvText = XLSX.utils.sheet_to_csv(firstSheet, { FS: '\t' });
      blob = new Blob([tsvText], { type: getMimeType('tsv') });
      break;
    }
    case 'json': {
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      const jsonText = JSON.stringify(jsonData, null, 2);
      blob = new Blob([jsonText], { type: getMimeType('json') });
      break;
    }
    case 'xml': {
      // Use SheetJS to produce a SpreadsheetML XML
      const out = XLSX.write(workbook, { bookType: 'xlml', type: 'string' });
      blob = new Blob([out], { type: getMimeType('xml') });
      break;
    }
    case 'html': {
      const htmlText = XLSX.utils.sheet_to_html(firstSheet);
      blob = new Blob([htmlText], { type: getMimeType('html') });
      break;
    }
    case 'txt': {
      const txtText = XLSX.utils.sheet_to_txt(firstSheet);
      blob = new Blob([txtText], { type: getMimeType('txt') });
      break;
    }
    case 'yaml':
    case 'yml': {
      const yaml = (await import('js-yaml')).default;
      const data = XLSX.utils.sheet_to_json(firstSheet);
      const yamlText = yaml.dump(data);
      blob = new Blob([yamlText], { type: getMimeType('yaml') });
      break;
    }
    case 'toml': {
      const TOML = await import('smol-toml');
      const data = XLSX.utils.sheet_to_json(firstSheet);
      // TOML needs a root object, wrap array in { rows: [...] }
      const tomlText = TOML.stringify({ rows: data } as Record<string, unknown>);
      blob = new Blob([tomlText], { type: getMimeType('toml') });
      break;
    }
    default:
      throw new Error(`Unsupported target format for spreadsheet conversion: ${targetFormat}`);
  }

  onProgress?.(100);

  return {
    blob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}
