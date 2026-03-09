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
  image: '#10b981',
  document: '#0ea5e9',
  audio: '#8b5cf6',
  video: '#f43f5e',
  data: '#f59e0b',
  unknown: '#6b7280',
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
