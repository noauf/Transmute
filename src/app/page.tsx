'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { DropZone } from '@/components/DropZone';
import { FileCard } from '@/components/FileCard';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useConversion } from '@/hooks/useConversion';
import { formatFileSize } from '@/lib/utils';

export default function Home() {
  const {
    files,
    isDragging,
    inputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInput,
    openFilePicker,
    removeFile,
    updateFile,
    setTargetFormat,
    clearAll,
  } = useFileUpload();

  const {
    isConverting,
    convertAll,
    downloadFile,
    downloadAllAsZip,
  } = useConversion(updateFile);

  const hasFiles = files.length > 0;
  const convertableCount = files.filter(
    (f) => f.targetFormat && f.status !== 'done' && f.availableFormats.length > 0
  ).length;
  const completedCount = files.filter((f) => f.status === 'done').length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="min-h-screen relative">
      {/* Atmospheric backgrounds */}
      <div className="bg-mesh" />
      <div className="noise-overlay" />

      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">T</div>
          <span>Transmute</span>
        </div>
        <span className="header-tag">v1.0 / client-side</span>
      </header>

      {/* Drop Zone */}
      <DropZone
        isDragging={isDragging}
        hasFiles={hasFiles}
        inputRef={inputRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileInput={handleFileInput}
        onBrowse={openFilePicker}
      />

      {/* File Grid */}
      {hasFiles && (
        <motion.div
          className="file-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {files.map((file, index) => (
              <FileCard
                key={file.id}
                file={file}
                index={index}
                onSetFormat={setTargetFormat}
                onRemove={removeFile}
                onDownload={downloadFile}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Action Bar */}
      {hasFiles && (
        <motion.div
          className="action-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="action-bar-info">
            <span className="action-bar-stat">
              <strong>{files.length}</strong> file{files.length !== 1 ? 's' : ''}
            </span>
            <div className="stat-divider" />
            <span className="action-bar-stat">
              <strong>{formatFileSize(totalSize)}</strong>
            </span>
            {completedCount > 0 && (
              <>
                <div className="stat-divider" />
                <span className="action-bar-stat">
                  <strong style={{ color: '#10b981' }}>{completedCount}</strong> converted
                </span>
              </>
            )}
          </div>

          <div className="action-bar-buttons">
            <button className="btn-secondary" onClick={clearAll}>
              Clear all
            </button>

            {completedCount > 0 && (
              <motion.button
                className="btn-download-all"
                onClick={() => downloadAllAsZip(files)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download ZIP
              </motion.button>
            )}

            <motion.button
              className={`btn-convert ${isConverting ? 'converting' : ''}`}
              onClick={() => convertAll(files)}
              disabled={isConverting || convertableCount === 0}
              whileHover={!isConverting && convertableCount > 0 ? { scale: 1.03 } : {}}
              whileTap={!isConverting && convertableCount > 0 ? { scale: 0.97 } : {}}
            >
              {isConverting ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Converting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Transmute {convertableCount > 0 ? `(${convertableCount})` : ''}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
