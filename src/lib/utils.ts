export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

export function buildOutputFilename(originalName: string, targetFormat: string): string {
  return `${getFileNameWithoutExtension(originalName)}.${targetFormat}`;
}

export function getMimeType(format: string): string {
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    ico: 'image/x-icon',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    opus: 'audio/opus',
    wma: 'audio/x-ms-wma',
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
    m4v: 'video/x-m4v',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    rtf: 'application/rtf',
    epub: 'application/epub+zip',
    html: 'text/html',
    htm: 'text/html',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
    yaml: 'application/x-yaml',
    yml: 'application/x-yaml',
    tsv: 'text/tab-separated-values',
    toml: 'application/toml',
    ini: 'text/plain',
    env: 'text/plain',
    properties: 'text/plain',
    ndjson: 'application/x-ndjson',
    jsonl: 'application/x-ndjson',
    sql: 'application/sql',
    // Spreadsheets
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    // HEIC
    heic: 'image/heic',
    heif: 'image/heif',
    // PSD
    psd: 'image/vnd.adobe.photoshop',
    // Presentations
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Fonts
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return mimeMap[format] || 'application/octet-stream';
}

export function truncateFilename(name: string, maxLength: number = 28): string {
  if (name.length <= maxLength) return name;
  const ext = name.split('.').pop() || '';
  const baseName = name.substring(0, name.length - ext.length - 1);
  const truncatedBase = baseName.substring(0, maxLength - ext.length - 4);
  return `${truncatedBase}...${ext}`;
}
