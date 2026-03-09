import { FileCategory } from '@/types';

const IMAGE_CONVERSIONS: Record<string, string[]> = {
  png: ['jpg', 'webp', 'gif', 'bmp', 'avif', 'tiff', 'ico'],
  jpg: ['png', 'webp', 'gif', 'bmp', 'avif', 'tiff', 'ico'],
  jpeg: ['png', 'webp', 'gif', 'bmp', 'avif', 'tiff', 'ico'],
  webp: ['png', 'jpg', 'gif', 'bmp', 'avif', 'tiff', 'ico'],
  gif: ['png', 'jpg', 'webp', 'bmp', 'avif', 'tiff'],
  bmp: ['png', 'jpg', 'webp', 'gif', 'avif', 'tiff'],
  tiff: ['png', 'jpg', 'webp', 'gif', 'bmp', 'avif'],
  tif: ['png', 'jpg', 'webp', 'gif', 'bmp', 'avif'],
  avif: ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff'],
  svg: ['png', 'jpg', 'webp', 'gif', 'bmp', 'avif', 'tiff'],
  ico: ['png', 'jpg', 'webp', 'gif', 'bmp'],
  heic: ['png', 'jpg', 'webp', 'gif', 'bmp', 'avif', 'tiff'],
  heif: ['png', 'jpg', 'webp', 'gif', 'bmp', 'avif', 'tiff'],
  psd: ['png', 'jpg', 'webp', 'gif', 'bmp', 'avif', 'tiff', 'ico'],
};

const DOCUMENT_CONVERSIONS: Record<string, string[]> = {
  pdf: ['txt', 'html', 'md', 'docx', 'epub'],
  docx: ['pdf', 'html', 'txt', 'md', 'epub'],
  md: ['html', 'pdf', 'txt', 'docx', 'epub', 'pptx'],
  html: ['pdf', 'txt', 'md', 'docx', 'epub', 'pptx'],
  htm: ['pdf', 'txt', 'md', 'docx', 'epub', 'pptx'],
  txt: ['pdf', 'html', 'md', 'docx', 'epub', 'pptx'],
  rtf: ['txt', 'html', 'md', 'pdf', 'docx'],
  epub: ['txt', 'html', 'md', 'pdf'],
  pptx: ['txt', 'html', 'pdf', 'md'],
};

const AUDIO_CONVERSIONS: Record<string, string[]> = {
  mp3: ['wav', 'ogg', 'aac', 'flac', 'm4a', 'opus'],
  wav: ['mp3', 'ogg', 'aac', 'flac', 'm4a', 'opus'],
  flac: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'opus'],
  ogg: ['mp3', 'wav', 'aac', 'flac', 'm4a', 'opus'],
  aac: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'opus'],
  m4a: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'opus'],
  wma: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
  opus: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
};

const VIDEO_CONVERSIONS: Record<string, string[]> = {
  mp4: ['webm', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  webm: ['mp4', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  avi: ['mp4', 'webm', 'mov', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  mov: ['mp4', 'webm', 'avi', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  mkv: ['mp4', 'webm', 'avi', 'mov', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  flv: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  wmv: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
  m4v: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav', 'ogg', 'aac', 'flac'],
};

const DATA_CONVERSIONS: Record<string, string[]> = {
  csv: ['json', 'xml', 'yaml', 'tsv', 'toml', 'xlsx', 'ini', 'env', 'properties', 'ndjson', 'sql'],
  json: ['csv', 'xml', 'yaml', 'tsv', 'toml', 'xlsx', 'ini', 'env', 'properties', 'ndjson', 'sql'],
  xml: ['json', 'csv', 'yaml', 'tsv', 'toml', 'xlsx'],
  yaml: ['json', 'csv', 'xml', 'tsv', 'toml', 'xlsx', 'ini', 'env', 'properties', 'ndjson', 'sql'],
  yml: ['json', 'csv', 'xml', 'tsv', 'toml', 'xlsx', 'ini', 'env', 'properties', 'ndjson', 'sql'],
  tsv: ['csv', 'json', 'xml', 'yaml', 'toml', 'xlsx', 'ndjson', 'sql'],
  toml: ['json', 'csv', 'xml', 'yaml', 'tsv', 'xlsx'],
  // Key-value formats
  ini: ['json', 'yaml', 'toml', 'env', 'properties', 'xml', 'csv'],
  env: ['json', 'yaml', 'toml', 'ini', 'properties', 'csv'],
  properties: ['json', 'yaml', 'toml', 'ini', 'env', 'csv'],
  // Line-delimited JSON
  ndjson: ['json', 'csv', 'tsv', 'yaml', 'xml', 'xlsx', 'sql'],
  jsonl: ['json', 'csv', 'tsv', 'yaml', 'xml', 'xlsx', 'sql'],
  // SQL
  sql: ['json', 'csv', 'tsv', 'yaml', 'xlsx'],
  // Spreadsheets
  xlsx: ['csv', 'json', 'tsv', 'xml', 'yaml', 'toml', 'ods', 'html', 'txt', 'ndjson', 'sql'],
  xls: ['xlsx', 'csv', 'json', 'tsv', 'xml', 'yaml', 'toml', 'ods', 'html', 'txt', 'ndjson', 'sql'],
  ods: ['xlsx', 'csv', 'json', 'tsv', 'xml', 'yaml', 'toml', 'html', 'txt', 'ndjson', 'sql'],
  // Fonts
  ttf: ['otf', 'woff', 'woff2'],
  otf: ['ttf', 'woff', 'woff2'],
  woff: ['ttf', 'otf', 'woff2'],
  woff2: ['ttf', 'otf', 'woff'],
};

const ALL_CONVERSIONS: Record<FileCategory, Record<string, string[]>> = {
  image: IMAGE_CONVERSIONS,
  document: DOCUMENT_CONVERSIONS,
  audio: AUDIO_CONVERSIONS,
  video: VIDEO_CONVERSIONS,
  data: DATA_CONVERSIONS,
  unknown: {},
};

export function getAvailableFormats(category: FileCategory, extension: string): string[] {
  return ALL_CONVERSIONS[category]?.[extension] || [];
}

export function getDefaultTarget(category: FileCategory, extension: string): string | null {
  const formats = getAvailableFormats(category, extension);
  if (formats.length === 0) return null;

  const defaults: Record<string, string> = {
    // Images → WebP (modern, smaller)
    png: 'webp', jpg: 'webp', jpeg: 'webp', gif: 'webp',
    bmp: 'png', tiff: 'png', tif: 'png', avif: 'png', svg: 'png', ico: 'png',
    heic: 'jpg', heif: 'jpg', psd: 'png',
    // Documents → PDF (except PDF → DOCX)
    docx: 'pdf', md: 'html', html: 'pdf', htm: 'pdf', txt: 'pdf',
    pdf: 'docx', rtf: 'docx', epub: 'html', pptx: 'pdf',
    // Audio → MP3
    wav: 'mp3', flac: 'mp3', ogg: 'mp3', aac: 'mp3', m4a: 'mp3', wma: 'mp3', opus: 'mp3', mp3: 'wav',
    // Video → MP4
    avi: 'mp4', mov: 'mp4', mkv: 'mp4', flv: 'mp4', wmv: 'mp4', m4v: 'mp4', mp4: 'webm', webm: 'mp4',
    // Data → JSON
    csv: 'json', xml: 'json', yaml: 'json', yml: 'json', tsv: 'csv', json: 'csv', toml: 'json',
    ini: 'json', env: 'json', properties: 'json', ndjson: 'json', jsonl: 'json', sql: 'json',
    // Spreadsheets → CSV
    xlsx: 'csv', xls: 'csv', ods: 'csv',
    // Fonts → WOFF2 (modern web standard)
    ttf: 'woff2', otf: 'woff2', woff: 'woff2', woff2: 'ttf',
  };

  return defaults[extension] || formats[0];
}
