'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { DropZone } from '@/components/DropZone';
import { FileCard } from '@/components/FileCard';
import { PreviewModal } from '@/components/PreviewModal';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useConversion } from '@/hooks/useConversion';
import { formatFileSize } from '@/lib/utils';
import { UploadedFile } from '@/types';

export default function ConvertPage() {
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

  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const hasFiles = files.length > 0;
  const convertableCount = files.filter(
    (f) => f.targetFormat && f.status !== 'done' && f.availableFormats.length > 0
  ).length;
  const completedCount = files.filter((f) => f.status === 'done').length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="min-h-screen relative bg-bg-cream">
      {/* Atmospheric backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-pastel-mesh" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-dots" />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-bg-cream/80 backdrop-blur-xl border-b border-border-soft">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <img src="/logo.png" alt="Transmute" className="w-8 h-8 rounded-[10px]" />
          <span className="font-serif font-extrabold text-xl tracking-tight text-text-dark">Transmute</span>
        </Link>
        <span className="font-mono text-[11px] text-text-light px-2.5 py-1 border border-border-soft rounded-full tracking-wide">
          v1.0 / client-side
        </span>
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
          className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 px-4 sm:px-6 pt-2 pb-44 sm:pb-36 relative z-10"
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
                onPreview={setPreviewFile}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Action Bar */}
      {hasFiles && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-bg-cream/85 backdrop-blur-xl border-t border-border-soft shadow-[0_-4px_20px_rgba(160,120,80,0.06)]"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-text-mid flex items-center gap-1.5">
              <strong className="text-text-dark font-semibold">{files.length}</strong> file{files.length !== 1 ? 's' : ''}
            </span>
            <div className="w-px h-4 bg-border-soft" />
            <span className="font-mono text-xs text-text-mid">
              <strong className="text-text-dark font-semibold">{formatFileSize(totalSize)}</strong>
            </span>
            {completedCount > 0 && (
              <>
                <div className="w-px h-4 bg-border-soft" />
                <span className="font-mono text-xs text-text-mid">
                  <strong className="text-mint font-semibold">{completedCount}</strong> converted
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center sm:justify-end">
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-text-mid bg-white border border-border-soft rounded-xl cursor-pointer hover:text-text-dark hover:border-border-med hover:shadow-[0_1px_3px_rgba(160,120,80,0.06)] transition-all"
              onClick={clearAll}
            >
              Clear all
            </button>

            {completedCount > 0 && (
              <motion.button
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white bg-mint border-none rounded-xl cursor-pointer shadow-[0_2px_12px_rgba(52,211,153,0.2)] hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(52,211,153,0.3)] transition-all"
                onClick={() => downloadAllAsZip(files)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download ZIP
              </motion.button>
            )}

            <motion.button
              className={`inline-flex items-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-pink border-none rounded-xl cursor-pointer shadow-[0_4px_20px_rgba(244,114,182,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(244,114,182,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none ${isConverting ? 'animate-pulse-soft opacity-85' : ''}`}
              onClick={() => convertAll(files)}
              disabled={isConverting || convertableCount === 0}
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
      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={(f) => {
          downloadFile(f);
          setPreviewFile(null);
        }}
      />
    </div>
  );
}
