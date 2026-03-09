'use client';

import { motion } from 'framer-motion';
import { UploadedFile, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';
import { formatFileSize, truncateFilename } from '@/lib/utils';
import { ProgressRing } from './ProgressRing';

interface FileCardProps {
  file: UploadedFile;
  index: number;
  onSetFormat: (id: string, format: string) => void;
  onRemove: (id: string) => void;
  onDownload: (file: UploadedFile) => void;
}

export function FileCard({
  file,
  index,
  onSetFormat,
  onRemove,
  onDownload,
}: FileCardProps) {
  const categoryColor = CATEGORY_COLORS[file.category];
  const categoryLabel = CATEGORY_LABELS[file.category];

  return (
    <motion.div
      className="relative bg-white rounded-2xl overflow-hidden border border-border-soft shadow-[0_2px_12px_rgba(180,140,100,0.06)] hover:shadow-[0_4px_24px_rgba(180,140,100,0.1)] hover:-translate-y-0.5 transition-all duration-200"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      layout
    >
      {/* Top accent line */}
      <div
        className="h-[3px] w-full"
        style={{ background: categoryColor }}
      />

      {/* Header: category badge + remove */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span
          className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold font-mono tracking-wider uppercase rounded-full border"
          style={{
            background: `${categoryColor}18`,
            color: categoryColor,
            borderColor: `${categoryColor}30`,
          }}
        >
          {categoryLabel}
        </span>

        {file.status !== 'converting' && (
          <button
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-transparent border-none cursor-pointer text-text-light hover:text-text-dark hover:bg-bg-warm transition-all"
            onClick={() => onRemove(file.id)}
            aria-label="Remove file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* File preview / icon */}
      <div className="relative flex items-center justify-center h-32 mx-4 mt-1 mb-2 rounded-xl bg-bg-warm/60 overflow-hidden">
        {file.preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <span
              className="font-mono text-2xl font-black tracking-wider opacity-60"
              style={{ color: categoryColor }}
            >
              .{file.extension}
            </span>
          </div>
        )}

        {/* Progress overlay */}
        {file.status === 'converting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-xl">
            <ProgressRing progress={file.progress} color={categoryColor} />
            <span className="font-mono text-xs font-bold text-text-dark">
              {Math.round(file.progress)}%
            </span>
          </div>
        )}

        {/* Done overlay */}
        {file.status === 'done' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-mint/10 backdrop-blur-sm rounded-xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-[0_2px_12px_rgba(52,211,153,0.2)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* Error overlay */}
        {file.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 backdrop-blur-sm rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-[0_2px_12px_rgba(244,63,94,0.15)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="px-4 pb-1">
        <p className="text-sm font-semibold text-text-dark truncate leading-snug" title={file.name}>
          {truncateFilename(file.name)}
        </p>
        <p className="font-mono text-[11px] text-text-light mt-0.5">
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Error message */}
      {file.status === 'error' && file.error && (
        <p className="px-4 pb-2 text-[12px] text-red-400 leading-snug">
          {file.error}
        </p>
      )}

      {/* Format selector */}
      {file.availableFormats.length > 0 && file.status !== 'done' && (
        <div className="flex items-center gap-2 px-4 pb-4 pt-1.5">
          <span className="font-mono text-xs font-bold text-text-mid bg-bg-warm px-2 py-1 rounded-lg">
            .{file.extension}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-light flex-shrink-0">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <select
            value={file.targetFormat || ''}
            onChange={(e) => onSetFormat(file.id, e.target.value)}
            className="select-arrow-warm flex-1 min-w-0 font-mono text-xs font-bold text-text-dark bg-white px-3 py-1.5 rounded-xl border border-border-soft cursor-pointer hover:border-border-med focus:outline-none focus:ring-2 focus:ring-pink/20 focus:border-pink/40 transition-all"
            style={{ borderColor: `${categoryColor}40` }}
          >
            {file.availableFormats.map((fmt) => (
              <option key={fmt} value={fmt}>
                .{fmt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Download button */}
      {file.status === 'done' && (
        <div className="px-4 pb-4 pt-1">
          <motion.button
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold text-white bg-mint border-none rounded-xl cursor-pointer shadow-[0_2px_12px_rgba(52,211,153,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(52,211,153,0.3)] transition-all"
            onClick={() => onDownload(file)}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download .{file.targetFormat}
          </motion.button>
        </div>
      )}

      {/* Unsupported message */}
      {file.availableFormats.length === 0 && (
        <p className="px-4 pb-4 pt-1 text-[12px] text-text-light italic text-center">
          Format not supported for conversion
        </p>
      )}
    </motion.div>
  );
}
