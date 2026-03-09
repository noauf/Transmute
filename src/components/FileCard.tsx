'use client';

import { useMemo } from 'react';
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
  onPreview: (file: UploadedFile) => void;
}

/* Seeded random for consistent per-card rotation */
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function FileCard({
  file,
  index,
  onSetFormat,
  onRemove,
  onDownload,
  onPreview,
}: FileCardProps) {
  const categoryColor = CATEGORY_COLORS[file.category];
  const categoryLabel = CATEGORY_LABELS[file.category];

  // Stable random rotation per card (-2.5 to 2.5 degrees)
  const rotation = useMemo(() => {
    const r = seededRandom(file.id);
    return (r - 0.5) * 5;
  }, [file.id]);

  // Slight random tape offset
  const tapeOffset = useMemo(() => {
    const r = seededRandom(file.id + 'tape');
    return (r - 0.5) * 20; // -10 to 10px
  }, [file.id]);

  return (
    <motion.div
      className="relative group"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
      initial={{ opacity: 0, y: 24, rotate: rotation }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      exit={{ opacity: 0, scale: 0.9, rotate: rotation + 5 }}
      transition={{
        duration: 0.45,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      whileHover={{
        rotate: 0,
        scale: 1.03,
        y: -4,
        transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
      }}
      layout
    >
      {/* Paper shadow — slightly offset for depth */}
      <div
        className="absolute inset-0 rounded-sm bg-text-dark/[0.03] translate-y-1 translate-x-0.5"
        style={{ filter: 'blur(4px)' }}
      />

      {/* Main paper */}
      <div className="relative bg-[#fffef9] rounded-sm overflow-visible shadow-[0_1px_2px_rgba(120,100,70,0.08)]">
        {/* Tape strip across top */}
        <div
          className="absolute -top-2.5 z-10 w-16 h-6 rounded-[2px] opacity-70"
          style={{
            left: `calc(50% + ${tapeOffset}px - 32px)`,
            background: `${categoryColor}40`,
            transform: `rotate(${-rotation * 0.5}deg)`,
            boxShadow: `0 1px 3px ${categoryColor}15`,
          }}
        />

        {/* Faint ruled lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, #8b7355 27px, #8b7355 28px)',
            backgroundPosition: '0 16px',
          }}
        />

        {/* Left margin line */}
        <div
          className="absolute top-0 bottom-0 left-10 w-px opacity-[0.06]"
          style={{ background: '#e8766a' }}
        />

        {/* Content */}
        <div className="relative p-4 pt-5">
          {/* Header: category + remove */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-sm"
              style={{
                color: categoryColor,
                background: `${categoryColor}10`,
              }}
            >
              {categoryLabel}
            </span>

            {file.status !== 'converting' && (
              <button
                className="flex items-center justify-center w-6 h-6 rounded-sm bg-transparent border-none cursor-pointer text-text-light/50 hover:text-text-dark hover:bg-text-dark/5 transition-all opacity-0 group-hover:opacity-100"
                onClick={() => onRemove(file.id)}
                aria-label="Remove file"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Extension — big typewriter style */}
          <div className="relative flex items-center justify-center py-5 mb-3">
            {file.preview ? (
              <div className="relative w-full h-28 rounded-sm overflow-hidden border border-border-soft/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <span
                className="font-mono text-[32px] font-black tracking-tight leading-none select-none"
                style={{ color: `${categoryColor}90` }}
              >
                .{file.extension}
              </span>
            )}

            {/* Progress overlay */}
            {file.status === 'converting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#fffef9]/85 backdrop-blur-[2px] rounded-sm">
                <ProgressRing progress={file.progress} color={categoryColor} />
                <span className="font-mono text-[11px] font-bold text-text-dark">
                  {Math.round(file.progress)}%
                </span>
              </div>
            )}

            {/* Done overlay */}
            {file.status === 'done' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-mint/[0.07] rounded-sm"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#fffef9] shadow-[0_2px_10px_rgba(52,211,153,0.15)] border border-mint/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Error overlay */}
            {file.status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50/70 backdrop-blur-[2px] rounded-sm">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#fffef9] shadow-[0_2px_10px_rgba(244,63,94,0.12)] border border-red-200/40">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Filename + size — handwritten feel area */}
          <div className="mb-2.5">
            <p className="text-[13px] font-semibold text-text-dark truncate leading-snug" title={file.name}>
              {truncateFilename(file.name)}
            </p>
            <p className="font-mono text-[10px] text-text-light mt-0.5 tracking-wide">
              {formatFileSize(file.size)}
            </p>
          </div>

          {/* Error message */}
          {file.status === 'error' && file.error && (
            <p className="pb-1 text-[11px] text-red-400 leading-snug">
              {file.error}
            </p>
          )}

          {/* Format selector — styled like a form field on paper */}
          {file.availableFormats.length > 0 && file.status !== 'done' && (
            <div className="flex items-center gap-2 pt-2.5 mt-1 border-t border-dashed border-text-dark/[0.06]">
              <span className="font-mono text-[11px] font-bold text-text-mid">
                .{file.extension}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-light/50 flex-shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <select
                value={file.targetFormat || ''}
                onChange={(e) => onSetFormat(file.id, e.target.value)}
                className="flex-1 min-w-0 font-mono text-[11px] font-bold text-text-dark bg-transparent px-2 py-1 rounded-sm border border-dashed cursor-pointer hover:border-text-dark/20 focus:outline-none focus:border-pink/40 transition-all appearance-none"
                style={{ borderColor: `${categoryColor}30` }}
              >
                {file.availableFormats.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    .{fmt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons — done state */}
          {file.status === 'done' && (
            <div className="flex items-center gap-2 pt-2.5 mt-1 border-t border-dashed border-text-dark/[0.06]">
              <motion.button
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-bold text-text-dark bg-transparent border border-dashed border-text-dark/10 rounded-sm cursor-pointer hover:bg-text-dark/[0.03] hover:border-text-dark/20 transition-all"
                onClick={() => onPreview(file)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview
              </motion.button>
              <motion.button
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-bold text-white bg-mint border-none rounded-sm cursor-pointer shadow-[0_1px_6px_rgba(52,211,153,0.2)] hover:shadow-[0_2px_12px_rgba(52,211,153,0.3)] transition-all"
                onClick={() => onDownload(file)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                .{file.targetFormat}
              </motion.button>
            </div>
          )}

          {/* Unsupported message */}
          {file.availableFormats.length === 0 && (
            <p className="pt-2.5 mt-1 text-[11px] text-text-light italic text-center border-t border-dashed border-text-dark/[0.06]">
              Format not supported for conversion
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
