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
};

const DOCUMENT_CONVERSIONS: Record<string, string[]> = {
  pdf: ['txt', 'html', 'md', 'docx'],
  docx: ['pdf', 'html', 'txt', 'md'],
  md: ['html', 'pdf', 'txt', 'docx'],
  html: ['pdf', 'txt', 'md', 'docx'],
  htm: ['pdf', 'txt', 'md', 'docx'],
  txt: ['pdf', 'html', 'md', 'docx'],
  rtf: ['txt', 'html', 'md', 'pdf', 'docx'],
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
  csv: ['json', 'xml', 'yaml', 'tsv', 'toml'],
  json: ['csv', 'xml', 'yaml', 'tsv', 'toml'],
  xml: ['json', 'csv', 'yaml', 'tsv', 'toml'],
  yaml: ['json', 'csv', 'xml', 'tsv', 'toml'],
  yml: ['json', 'csv', 'xml', 'tsv', 'toml'],
  tsv: ['csv', 'json', 'xml', 'yaml', 'toml'],
  toml: ['json', 'csv', 'xml', 'yaml', 'tsv'],
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
    // Documents → PDF (except PDF → DOCX)
    docx: 'pdf', md: 'html', html: 'pdf', htm: 'pdf', txt: 'pdf',
    pdf: 'docx', rtf: 'docx',
    // Audio → MP3
    wav: 'mp3', flac: 'mp3', ogg: 'mp3', aac: 'mp3', m4a: 'mp3', wma: 'mp3', opus: 'mp3', mp3: 'wav',
    // Video → MP4
    avi: 'mp4', mov: 'mp4', mkv: 'mp4', flv: 'mp4', wmv: 'mp4', m4v: 'mp4', mp4: 'webm', webm: 'mp4',
    // Data → JSON
    csv: 'json', xml: 'json', yaml: 'json', yml: 'json', tsv: 'csv', json: 'csv', toml: 'json',
  };

  return defaults[extension] || formats[0];
}
