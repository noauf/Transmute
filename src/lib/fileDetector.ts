import { FileCategory } from '@/types';

const EXTENSION_MAP: Record<string, FileCategory> = {
  // Images
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image',
  bmp: 'image', tiff: 'image', tif: 'image', avif: 'image', svg: 'image',
  ico: 'image',
  // Documents
  pdf: 'document', docx: 'document', txt: 'document',
  md: 'document', html: 'document', htm: 'document', rtf: 'document',
  epub: 'document', pptx: 'document',
  // Audio
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', aac: 'audio',
  m4a: 'audio', wma: 'audio', opus: 'audio',
  // Video
  mp4: 'video', webm: 'video', avi: 'video', mov: 'video', mkv: 'video',
  flv: 'video', wmv: 'video', m4v: 'video',
  // Data
  csv: 'data', json: 'data', xml: 'data', yaml: 'data', yml: 'data',
  tsv: 'data', toml: 'data',
  ini: 'data', env: 'data', properties: 'data',
  ndjson: 'data', jsonl: 'data', sql: 'data',
  // Spreadsheets (category: data)
  xlsx: 'data', xls: 'data', ods: 'data',
  // HEIC images
  heic: 'image', heif: 'image',
  // PSD (Photoshop)
  psd: 'image',
  // Fonts (categorized as data for routing)
  ttf: 'data', otf: 'data', woff: 'data', woff2: 'data',
};

export function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function detectCategory(file: File): FileCategory {
  const ext = getExtension(file.name);
  return EXTENSION_MAP[ext] || 'unknown';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isSupported(filename: string): boolean {
  const ext = getExtension(filename);
  return ext in EXTENSION_MAP;
}
