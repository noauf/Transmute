'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { DropZone } from '@/components/DropZone';
import { FileRow } from '@/components/FileRow';
import { PreviewModal } from '@/components/PreviewModal';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useConversion } from '@/hooks/useConversion';
import { formatFileSize } from '@/lib/utils';
import { UploadedFile } from '@/types';

/* Number of ghost rows to show below real files */
const MIN_VISIBLE_ROWS = 8;

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
  const ghostRowCount = Math.max(0, MIN_VISIBLE_ROWS - files.length);

  return (
    <div className="min-h-screen relative bg-bg-cream">
      {/* Atmospheric backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-pastel-mesh" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-dots" />

      {/* Hidden file input — lives at top level so the ref is always stable */}
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Finder Window — the entire converter lives inside this */}
      <div className="relative z-10 max-w-[960px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <motion.div
          className="flex flex-col max-h-[calc(100vh-80px)] rounded-xl overflow-hidden shadow-[0_12px_60px_rgba(45,31,20,0.12)] border border-border-soft bg-white"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
        >
          {/* ─ Title bar ─ */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#f6f6f6] border-b border-border-soft select-none">
            {/* Traffic lights */}
            <Link href="/" className="flex items-center gap-[6px] no-underline group/dots">
              <div className="w-[11px] h-[11px] rounded-full bg-[#ff5f57] border border-[#e0443e]/40 group-hover/dots:bg-[#ff3b30] transition-colors" />
              <div className="w-[11px] h-[11px] rounded-full bg-[#febc2e] border border-[#dea123]/40 group-hover/dots:bg-[#ff9500] transition-colors" />
              <div className="w-[11px] h-[11px] rounded-full bg-[#28c840] border border-[#1aab29]/40 group-hover/dots:bg-[#28cd41] transition-colors" />
            </Link>

            {/* Navigation arrows */}
            <div className="flex items-center gap-1 ml-1">
              <Link href="/" className="text-text-light/40 hover:text-text-mid transition-colors no-underline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </Link>
              <div className="text-text-light/25">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </div>

            {/* Breadcrumb — centered */}
            <div className="flex-1 flex items-center justify-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-4 h-4 rounded-[4px]" />
              <span className="text-[12px] font-medium text-text-mid">Transmute</span>
              <span className="text-[12px] text-text-light/40">{'\u203A'}</span>
              <span className="text-[12px] font-medium text-text-dark">Converter</span>
            </div>

            {/* Right side — version + add files button */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-light/50 tracking-wide hidden sm:block">
                v1.0
              </span>
              {hasFiles && (
                <button
                  className="flex items-center justify-center w-6 h-6 rounded-md bg-transparent border border-border-soft/60 cursor-pointer text-text-light hover:text-pink hover:border-pink/30 transition-all"
                  onClick={openFilePicker}
                  title="Add files"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ─ Toolbar (only when files present) ─ */}
          {hasFiles && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#fafafa] border-b border-border-soft">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-text-mid">
                  <strong className="text-text-dark">{files.length}</strong> file{files.length !== 1 ? 's' : ''}
                </span>
                <div className="w-px h-3.5 bg-border-soft" />
                <span className="font-mono text-[11px] text-text-mid">
                  {formatFileSize(totalSize)}
                </span>
                {completedCount > 0 && (
                  <>
                    <div className="w-px h-3.5 bg-border-soft" />
                    <span className="font-mono text-[11px] text-text-mid flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-mint" />
                      <strong className="text-mint">{completedCount}</strong> converted
                    </span>
                  </>
                )}
              </div>
              <button
                className="font-mono text-[11px] text-text-light hover:text-text-dark cursor-pointer bg-transparent border-none transition-colors"
                onClick={clearAll}
              >
                Clear all
              </button>
            </div>
          )}

          {/* ─ Column headers (only when files present) ─ */}
          {hasFiles && (
            <div className="flex-shrink-0 flex items-center px-4 py-1.5 bg-[#fafafa] border-b border-border-soft text-[11px] font-medium text-text-light tracking-wide uppercase select-none">
              <div className="flex-1 pl-10">Name</div>
              <div className="w-[72px] text-right hidden sm:block">Size</div>
              <div className="w-[140px] text-center hidden sm:block">Convert to</div>
              <div className="w-[130px] text-right pr-1">Status</div>
            </div>
          )}

          {/* ─ Content area (scrollable) ─ */}
          <div
            className="relative flex-1 overflow-y-auto min-h-0"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ minHeight: hasFiles ? undefined : '60vh' }}
          >
            {/* Drop zone (empty state) */}
            {!hasFiles && (
              <DropZone
                isDragging={isDragging}
                hasFiles={false}
                inputRef={inputRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onFileInput={handleFileInput}
                onBrowse={openFilePicker}
              />
            )}

            {/* Drag overlay when files present */}
            {hasFiles && isDragging && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center bg-pink/[0.04] border-2 border-dashed border-pink/30 rounded-b-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-2 text-pink font-semibold text-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Drop to add files
                </div>
              </motion.div>
            )}

            {/* File rows */}
            {hasFiles && (
              <div className="divide-y divide-border-soft/50">
                <AnimatePresence mode="popLayout">
                  {files.map((file, index) => (
                    <FileRow
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

                {/* Ghost / placeholder rows */}
                {ghostRowCount > 0 && (
                  <>
                    {Array.from({ length: ghostRowCount }).map((_, i) => (
                      <div
                        key={`ghost-${i}`}
                        className={`flex items-center px-4 py-2.5 ${i === 0 ? 'cursor-pointer hover:bg-[#fafafa] transition-colors' : ''}`}
                        onClick={i === 0 ? openFilePicker : undefined}
                      >
                        {/* Ghost icon */}
                        <div className="w-8 h-8 rounded-lg bg-border-soft/20 flex-shrink-0" />
                        {/* Ghost name bar */}
                        <div className="flex-1 ml-3">
                          {i === 0 ? (
                            <span className="text-[12px] text-text-light/40 flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-40">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                              </svg>
                              Drop files here or click to browse
                            </span>
                          ) : (
                            <div className="h-2.5 w-24 rounded bg-border-soft/15" style={{ width: `${60 + ((i * 37) % 60)}px` }} />
                          )}
                        </div>
                        {/* Ghost size */}
                        <div className="w-[72px] hidden sm:block">
                          {i < 2 && <div className="h-2 w-10 rounded bg-border-soft/10 ml-auto" />}
                        </div>
                        {/* Ghost convert to */}
                        <div className="w-[140px] hidden sm:block">
                          {i < 2 && <div className="h-2 w-12 rounded bg-border-soft/10 mx-auto" />}
                        </div>
                        {/* Ghost status */}
                        <div className="w-[130px] pr-1">
                          {i < 1 && <div className="h-2 w-8 rounded bg-border-soft/10 ml-auto" />}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ─ Bottom action bar (always visible) ─ */}
          {hasFiles && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#fafafa] border-t border-border-soft">
              {/* Left — status */}
              <div className="flex items-center gap-1.5">
                {isConverting ? (
                  <>
                    <motion.div
                      className="w-3 h-3 rounded-full border-[1.5px] border-pink border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="text-[11px] font-mono text-pink font-medium">Converting...</span>
                  </>
                ) : completedCount === files.length && completedCount > 0 ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-mint" />
                    <span className="text-[11px] font-mono text-mint font-medium">All converted</span>
                  </>
                ) : (
                  <span className="text-[11px] text-text-light font-mono">
                    {convertableCount > 0 ? `${convertableCount} ready to convert` : 'Select target formats'}
                  </span>
                )}
              </div>

              {/* Right — action buttons */}
              <div className="flex items-center gap-2">
                {completedCount > 0 && (
                  <motion.button
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold text-white bg-mint border-none rounded-lg cursor-pointer shadow-[0_2px_8px_rgba(52,211,153,0.2)] hover:-translate-y-0.5 hover:shadow-[0_3px_14px_rgba(52,211,153,0.3)] transition-all"
                    onClick={() => downloadAllAsZip(files)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    ZIP
                  </motion.button>
                )}

                <button
                  className={`inline-flex items-center gap-1.5 px-5 py-1.5 text-[12px] font-bold text-white bg-pink border-none rounded-lg cursor-pointer shadow-[0_2px_12px_rgba(244,114,182,0.25)] hover:-translate-y-0.5 hover:shadow-[0_4px_18px_rgba(244,114,182,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none ${isConverting ? 'animate-pulse-soft opacity-85' : ''}`}
                  onClick={() => convertAll(files)}
                  disabled={isConverting || convertableCount === 0}
                >
                  {isConverting ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Converting...
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Transmute{convertableCount > 0 ? ` (${convertableCount})` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer outside window */}
        <div className="text-center mt-4">
          <p className="font-mono text-[10px] text-text-light/50 tracking-wide">
            100% client-side &mdash; files never leave your browser
          </p>
        </div>
      </div>

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
