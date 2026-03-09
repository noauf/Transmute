export type FileCategory = 'image' | 'document' | 'audio' | 'video' | 'data' | 'unknown';

export type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  extension: string;
  preview?: string;
  targetFormat: string | null;
  availableFormats: string[];
  status: ConversionStatus;
  progress: number;
  convertedBlob?: Blob;
  convertedName?: string;
  error?: string;
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
}

export const CATEGORY_COLORS: Record<FileCategory, string> = {
  image: '#f472b6',    // soft pink
  document: '#60a5fa',  // soft blue
  audio: '#a78bfa',    // soft purple
  video: '#fb923c',    // soft orange
  data: '#34d399',     // soft mint
  unknown: '#94a3b8',  // soft slate
};

export const CATEGORY_ICONS: Record<FileCategory, string> = {
  image: '\u{1F5BC}',
  document: '\u{1F4C4}',
  audio: '\u{1F3B5}',
  video: '\u{1F3AC}',
  data: '\u{1F4CA}',
  unknown: '\u{1F4C1}',
};

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  image: 'Image',
  document: 'Document',
  audio: 'Audio',
  video: 'Video',
  data: 'Data',
  unknown: 'File',
};
