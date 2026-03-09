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
      className="file-card"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      layout
      style={{
        '--card-accent': categoryColor,
      } as React.CSSProperties}
    >
      {/* Top accent line */}
      <div
        className="card-accent-line"
        style={{ background: categoryColor }}
      />

      {/* Header: category badge + remove */}
      <div className="card-header">
        <span
          className="category-badge"
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
            className="remove-btn"
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
      <div className="card-preview">
        {file.preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={file.preview}
            alt={file.name}
            className="preview-image"
          />
        ) : (
          <div
            className="preview-icon"
            style={{ color: categoryColor }}
          >
            <span className="file-ext">.{file.extension}</span>
          </div>
        )}

        {/* Progress overlay */}
        {file.status === 'converting' && (
          <div className="progress-overlay">
            <ProgressRing progress={file.progress} color={categoryColor} />
            <span className="progress-text">{Math.round(file.progress)}%</span>
          </div>
        )}

        {/* Done overlay */}
        {file.status === 'done' && (
          <motion.div
            className="done-overlay"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}

        {/* Error overlay */}
        {file.status === 'error' && (
          <div className="error-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="card-info">
        <p className="file-name" title={file.name}>
          {truncateFilename(file.name)}
        </p>
        <p className="file-size">{formatFileSize(file.size)}</p>
      </div>

      {/* Error message */}
      {file.status === 'error' && file.error && (
        <p className="error-message">{file.error}</p>
      )}

      {/* Format selector */}
      {file.availableFormats.length > 0 && file.status !== 'done' && (
        <div className="format-selector">
          <span className="format-from">.{file.extension}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="format-arrow">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <select
            value={file.targetFormat || ''}
            onChange={(e) => onSetFormat(file.id, e.target.value)}
            className="format-select"
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
        <motion.button
          className="download-btn"
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
      )}

      {/* Unsupported message */}
      {file.availableFormats.length === 0 && (
        <p className="unsupported-msg">
          Format not supported for conversion
        </p>
      )}
    </motion.div>
  );
}
