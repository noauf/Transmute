'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { UploadedFile, CATEGORY_COLORS, CATEGORY_ICONS } from '@/types';
import { formatFileSize, truncateFilename } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';

interface FileRowProps {
  file: UploadedFile;
  index: number;
  onSetFormat: (id: string, format: string) => void;
  onRemove: (id: string) => void;
  onDownload: (file: UploadedFile) => void;
  onPreview: (file: UploadedFile) => void;
}

export function FileRow({
  file,
  index,
  onSetFormat,
  onRemove,
  onDownload,
  onPreview,
}: FileRowProps) {
  const color = CATEGORY_COLORS[file.category];
  const icon = CATEGORY_ICONS[file.category];

  return (
    <motion.div
      className="group relative px-3 sm:px-4 py-2.5 hover:bg-[#fafafa] transition-colors"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] as const }}
      layout
    >
      {/* ─── Desktop layout (sm+) ─── */}
      <div className="hidden sm:flex items-center">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0"
          style={{ background: `${color}12` }}
        >
          {file.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            icon
          )}
        </div>

        {/* Name + extension */}
        <div className="flex-1 min-w-0 ml-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-text-dark truncate" title={file.name}>
              {truncateFilename(file.name, 36)}
            </span>
            <span
              className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: `${color}10`, color }}
            >
              .{file.extension}
            </span>
          </div>
          {file.status === 'error' && file.error && (
            <p className="text-[10px] text-red-400 truncate mt-0.5">{file.error}</p>
          )}
        </div>

        {/* Size */}
        <div className="w-[72px] text-right font-mono text-[11px] text-text-light flex-shrink-0">
          {formatFileSize(file.size)}
        </div>

        {/* Format selector — always available (even after conversion) */}
        <div className="w-[140px] flex items-center justify-center flex-shrink-0">
          {file.availableFormats.length > 0 && file.status !== 'converting' ? (
            <div className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-light/40 flex-shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <select
                value={file.targetFormat || ''}
                onChange={(e) => onSetFormat(file.id, e.target.value)}
                className="font-mono text-[11px] font-bold text-text-dark bg-transparent px-1.5 py-1 rounded-md border border-border-soft/60 cursor-pointer hover:border-pink/30 focus:outline-none focus:border-pink/40 transition-all appearance-none select-arrow-warm w-[72px]"
              >
                {file.availableFormats.map((fmt) => (
                  <option key={fmt} value={fmt}>.{fmt}</option>
                ))}
              </select>
            </div>
          ) : file.status === 'converting' ? (
            <span
              className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md"
              style={{ background: `${color}10`, color }}
            >
              .{file.targetFormat}
            </span>
          ) : (
            <span className="text-[10px] text-text-light/40 italic">unsupported</span>
          )}
        </div>

        {/* Status / actions */}
        <div className="w-[130px] flex items-center justify-end gap-1.5 flex-shrink-0 pr-1">
          <DesktopStatus file={file} color={color} onRemove={onRemove} onDownload={onDownload} onPreview={onPreview} />
        </div>
      </div>

      {/* ─── Mobile layout (< sm) ─── */}
      <div className="flex sm:hidden items-start gap-2.5">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0 mt-0.5"
          style={{ background: `${color}12` }}
        >
          {file.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.preview} alt="" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + remove button */}
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-text-dark truncate flex-1" title={file.name}>
              {truncateFilename(file.name, 24)}
            </span>
            <span
              className="font-mono text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
              style={{ background: `${color}10`, color }}
            >
              .{file.extension}
            </span>
            {/* Remove — always visible on mobile */}
            {file.status !== 'converting' && (
              <button
                className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer text-text-light/40 active:text-red-400 active:bg-red-50 transition-all flex-shrink-0 -mr-1"
                onClick={() => onRemove(file.id)}
                aria-label="Remove file"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Row 2: Size + format selector + status */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-mono text-[10px] text-text-light flex-shrink-0">
              {formatFileSize(file.size)}
            </span>

            {/* Format selector or status */}
            <MobileStatus
              file={file}
              color={color}
              onSetFormat={onSetFormat}
              onDownload={onDownload}
              onPreview={onPreview}
            />
          </div>

          {/* Error message */}
          {file.status === 'error' && file.error && (
            <p className="text-[10px] text-red-400 truncate mt-1">{file.error}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Desktop status (sm+) ─────────────────────────────── */
function DesktopStatus({
  file,
  color,
  onRemove,
  onDownload,
  onPreview,
}: {
  file: UploadedFile;
  color: string;
  onRemove: (id: string) => void;
  onDownload: (file: UploadedFile) => void;
  onPreview: (file: UploadedFile) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {file.status === 'idle' && (
        <motion.div
          key="idle"
          className="flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer text-text-light/30 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            onClick={() => onRemove(file.id)}
            aria-label="Remove file"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}

      {file.status === 'converting' && (
        <motion.div
          key="converting"
          className="flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <ProgressRing progress={file.progress} size={20} strokeWidth={2} color={color} />
          <span className="font-mono text-[11px] font-medium" style={{ color }}>
            {Math.round(file.progress)}%
          </span>
        </motion.div>
      )}

      {file.status === 'done' && (
        <motion.div
          key="done"
          className="flex items-center gap-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-mint flex-shrink-0">
            <circle cx="12" cy="12" r="10" fill="rgba(52,211,153,0.12)" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <button
            className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer text-text-light/50 hover:text-purple hover:bg-purple/8 transition-all"
            onClick={() => onPreview(file)}
            title="Preview"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-mint border-none rounded-md cursor-pointer shadow-[0_1px_4px_rgba(52,211,153,0.2)] hover:shadow-[0_2px_8px_rgba(52,211,153,0.3)] transition-all"
            onClick={() => onDownload(file)}
            title="Download"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            .{file.targetFormat}
          </button>
        </motion.div>
      )}

      {file.status === 'error' && (
        <motion.div
          key="error"
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-red-400 flex-shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="rgba(244,63,94,0.08)" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] text-red-400 font-mono font-medium">Failed</span>
          <button
            className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none cursor-pointer text-text-light/40 hover:text-red-400 transition-all"
            onClick={() => onRemove(file.id)}
            aria-label="Remove"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Mobile status (< sm) ─────────────────────────────── */
function MobileStatus({
  file,
  color,
  onSetFormat,
  onDownload,
  onPreview,
}: {
  file: UploadedFile;
  color: string;
  onSetFormat: (id: string, format: string) => void;
  onDownload: (file: UploadedFile) => void;
  onPreview: (file: UploadedFile) => void;
}) {
  if (file.status === 'idle' && file.availableFormats.length > 0) {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-light/40 flex-shrink-0">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <select
          value={file.targetFormat || ''}
          onChange={(e) => onSetFormat(file.id, e.target.value)}
          className="font-mono text-[11px] font-bold text-text-dark bg-transparent px-1.5 py-0.5 rounded-md border border-border-soft/60 cursor-pointer focus:outline-none focus:border-pink/40 transition-all appearance-none select-arrow-warm"
          style={{ maxWidth: '80px' }}
        >
          {file.availableFormats.map((fmt) => (
            <option key={fmt} value={fmt}>.{fmt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (file.status === 'converting') {
    return (
      <div className="flex items-center gap-1.5">
        <ProgressRing progress={file.progress} size={16} strokeWidth={2} color={color} />
        <span className="font-mono text-[10px] font-medium" style={{ color }}>
          {Math.round(file.progress)}%
        </span>
      </div>
    );
  }

  if (file.status === 'done') {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {/* Format selector — pick a new format to convert again */}
        <select
          value={file.targetFormat || ''}
          onChange={(e) => onSetFormat(file.id, e.target.value)}
          className="font-mono text-[11px] font-bold text-text-dark bg-transparent px-1.5 py-0.5 rounded-md border border-border-soft/60 cursor-pointer focus:outline-none focus:border-pink/40 transition-all appearance-none select-arrow-warm"
          style={{ maxWidth: '70px' }}
        >
          {file.availableFormats.map((fmt) => (
            <option key={fmt} value={fmt}>.{fmt}</option>
          ))}
        </select>
        <button
          className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border-none cursor-pointer text-text-light/50 active:text-purple transition-all flex-shrink-0"
          onClick={() => onPreview(file)}
          title="Preview"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-mint border-none rounded-md cursor-pointer shadow-[0_1px_4px_rgba(52,211,153,0.2)] transition-all flex-shrink-0"
          onClick={() => onDownload(file)}
          title="Download"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          .{file.targetFormat}
        </button>
      </div>
    );
  }

  if (file.status === 'error') {
    return (
      <div className="flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-red-400 flex-shrink-0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="rgba(244,63,94,0.08)" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] text-red-400 font-mono font-medium">Failed</span>
      </div>
    );
  }

  // No formats available
  return (
    <span className="text-[10px] text-text-light/40 italic">unsupported</span>
  );
}
