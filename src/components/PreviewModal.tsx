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

/** Formats we can show as text in a <pre> block */
const TEXT_FORMATS = new Set([
  'txt', 'md', 'json', 'csv', 'tsv', 'xml', 'yaml', 'yml', 'toml',
  'ini', 'env', 'properties', 'ndjson', 'jsonl', 'sql', 'rst', 'tex',
]);

/** Formats that render in an <iframe> */
const IFRAME_FORMATS = new Set(['pdf', 'html', 'htm']);

/** Image formats for <img> */
const IMAGE_FORMATS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg', 'ico', 'tiff', 'tif',
]);

/** Audio formats for <audio> */
const AUDIO_FORMATS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus', 'wma']);

/** Video formats for <video> */
const VIDEO_FORMATS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

function getPreviewType(format: string): 'text' | 'iframe' | 'image' | 'audio' | 'video' | 'none' {
  if (IMAGE_FORMATS.has(format)) return 'image';
  if (IFRAME_FORMATS.has(format)) return 'iframe';
  if (AUDIO_FORMATS.has(format)) return 'audio';
  if (VIDEO_FORMATS.has(format)) return 'video';
  if (TEXT_FORMATS.has(format)) return 'text';
  return 'none';
}

export function PreviewModal({ file, onClose, onDownload }: PreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  const targetFormat = file?.targetFormat || '';
  const previewType = getPreviewType(targetFormat);

  // Load preview content
  useEffect(() => {
    if (!file?.convertedBlob || !file?.targetFormat) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setTextContent(null);

    const type = getPreviewType(file.targetFormat);

    if (type === 'text') {
      // Read blob as text
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target?.result as string);
        setLoading(false);
      };
      reader.onerror = () => {
        setTextContent('[Failed to read file content]');
        setLoading(false);
      };
      reader.readAsText(file.convertedBlob);
    } else if (type === 'image' || type === 'iframe' || type === 'audio' || type === 'video') {
      const url = URL.createObjectURL(file.convertedBlob);
      setBlobUrl(url);
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.convertedBlob, file?.targetFormat]);

  // Cleanup blob URL on unmount
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
              ) : previewType === 'image' && blobUrl ? (
                <div className="flex items-center justify-center p-6 min-h-[300px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blobUrl}
                    alt={file.convertedName || 'Preview'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                  />
                </div>
              ) : previewType === 'iframe' && blobUrl ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-[70vh] border-none"
                  title="File preview"
                  sandbox="allow-same-origin"
                />
              ) : previewType === 'audio' && blobUrl ? (
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
              ) : previewType === 'video' && blobUrl ? (
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
              ) : previewType === 'text' && textContent !== null ? (
                <div className="p-4">
                  <pre className="w-full p-4 bg-white rounded-xl border border-border-soft font-mono text-[13px] leading-relaxed text-text-dark overflow-auto max-h-[70vh] whitespace-pre-wrap break-words">
                    {textContent.length > 100000
                      ? textContent.slice(0, 100000) + '\n\n... [truncated — file too large for preview]'
                      : textContent}
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
