import { FileCategory } from '@/types';

const IMAGE_CONVERSIONS: Record<string, string[]> = {
  png: ['jpg', 'webp', 'gif', 'bmp', 'avif'],
  jpg: ['png', 'webp', 'gif', 'bmp', 'avif'],
  jpeg: ['png', 'webp', 'gif', 'bmp', 'avif'],
  webp: ['png', 'jpg', 'gif', 'bmp', 'avif'],
  gif: ['png', 'jpg', 'webp', 'bmp'],
  bmp: ['png', 'jpg', 'webp', 'gif'],
  tiff: ['png', 'jpg', 'webp'],
  tif: ['png', 'jpg', 'webp'],
  avif: ['png', 'jpg', 'webp'],
  svg: ['png', 'jpg', 'webp'],
  ico: ['png', 'jpg', 'webp'],
};

const DOCUMENT_CONVERSIONS: Record<string, string[]> = {
  docx: ['html', 'txt', 'pdf'],
  md: ['html', 'pdf', 'txt'],
  html: ['pdf', 'txt', 'md'],
  htm: ['pdf', 'txt', 'md'],
  txt: ['pdf', 'html', 'md'],
  pdf: ['txt'],
};

const AUDIO_CONVERSIONS: Record<string, string[]> = {
  mp3: ['wav', 'ogg', 'aac', 'flac', 'm4a'],
  wav: ['mp3', 'ogg', 'aac', 'flac', 'm4a'],
  flac: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
  ogg: ['mp3', 'wav', 'aac', 'flac', 'm4a'],
  aac: ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
  m4a: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
  wma: ['mp3', 'wav', 'ogg', 'flac'],
  opus: ['mp3', 'wav', 'ogg', 'flac'],
};

const VIDEO_CONVERSIONS: Record<string, string[]> = {
  mp4: ['webm', 'avi', 'mov', 'gif', 'mp3'],
  webm: ['mp4', 'avi', 'mov', 'gif', 'mp3'],
  avi: ['mp4', 'webm', 'mov', 'gif', 'mp3'],
  mov: ['mp4', 'webm', 'avi', 'gif', 'mp3'],
  mkv: ['mp4', 'webm', 'avi', 'gif', 'mp3'],
  flv: ['mp4', 'webm', 'avi', 'mp3'],
  wmv: ['mp4', 'webm', 'avi', 'mp3'],
  m4v: ['mp4', 'webm', 'avi', 'mp3'],
};

const DATA_CONVERSIONS: Record<string, string[]> = {
  csv: ['json', 'xml', 'yaml', 'tsv'],
  json: ['csv', 'xml', 'yaml'],
  xml: ['json', 'csv', 'yaml'],
  yaml: ['json', 'csv', 'xml'],
  yml: ['json', 'csv', 'xml'],
  tsv: ['csv', 'json', 'xml', 'yaml'],
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
    // Documents → PDF
    docx: 'pdf', md: 'html', html: 'pdf', txt: 'pdf', pdf: 'txt',
    // Audio → MP3
    wav: 'mp3', flac: 'mp3', ogg: 'mp3', aac: 'mp3', m4a: 'mp3', wma: 'mp3', opus: 'mp3', mp3: 'wav',
    // Video → MP4
    avi: 'mp4', mov: 'mp4', mkv: 'mp4', flv: 'mp4', wmv: 'mp4', m4v: 'mp4', mp4: 'webm', webm: 'mp4',
    // Data → JSON
    csv: 'json', xml: 'json', yaml: 'json', yml: 'json', tsv: 'csv', json: 'csv',
  };

  return defaults[extension] || formats[0];
}
