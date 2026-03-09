'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface DropZoneProps {
  isDragging: boolean;
  hasFiles: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowse: () => void;
}

export function DropZone({
  isDragging,
  hasFiles,
  inputRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileInput,
  onBrowse,
}: DropZoneProps) {
  // Compact mode — thin bar when files are present
  if (hasFiles) {
    return (
      <div
        className="px-6 py-3 relative z-10"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onFileInput}
          className="hidden"
        />
        <div
          className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none ${
            isDragging
              ? 'border-pink bg-pink/5 text-pink scale-[1.01]'
              : 'border-border-soft bg-white/60 text-text-light hover:border-pink/40 hover:text-pink/70 hover:bg-white/80'
          }`}
          onClick={onBrowse}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm font-semibold">
            {isDragging ? 'Release to add files' : 'Drop more files or click to browse'}
          </span>
        </div>
      </div>
    );
  }

  // Hero mode — full drop zone when no files
  return (
    <div
      className="flex items-center justify-center min-h-[70vh] px-6 py-16 relative z-10"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={onFileInput}
        className="hidden"
      />

      <motion.div
        className={`relative w-full max-w-xl rounded-3xl border-2 border-dashed p-12 text-center transition-colors duration-300 ${
          isDragging
            ? 'border-pink bg-pink/[0.04] shadow-[0_8px_40px_rgba(244,114,182,0.12)]'
            : 'border-border-med bg-white/50 shadow-[0_4px_24px_rgba(180,140,100,0.06)]'
        }`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: isDragging ? 1.02 : 1,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      >
        {/* Corner accents */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-pink/30 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-purple/30 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-blue/30 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-mint/30 rounded-br-lg" />

        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Upload icon */}
          <motion.div
            className={`flex items-center justify-center w-20 h-20 rounded-2xl transition-colors duration-300 ${
              isDragging
                ? 'bg-pink/15 text-pink'
                : 'bg-pink/8 text-pink/70'
            }`}
            animate={{
              y: isDragging ? -10 : 0,
              scale: isDragging ? 1.15 : 1,
              rotate: isDragging ? -5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 32V8M24 8L16 16M24 8L32 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 28v8a4 4 0 004 4h24a4 4 0 004-4v-8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          <h2 className="font-serif text-3xl font-extrabold text-text-dark tracking-tight">
            {isDragging ? 'Release to transmute' : 'Drop anything.'}
          </h2>
          <p className="text-text-mid text-[15px] max-w-xs leading-relaxed">
            {isDragging
              ? 'Your files are ready for transformation'
              : 'Images, documents, audio, video, data \u2014 all formats welcome'}
          </p>

          <motion.button
            className="inline-flex items-center gap-2 mt-2 px-7 py-3 text-sm font-bold text-white bg-pink rounded-2xl cursor-pointer shadow-[0_4px_20px_rgba(244,114,182,0.25)] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(244,114,182,0.35)] transition-all border-none"
            onClick={onBrowse}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Browse files
          </motion.button>

          <p className="font-mono text-[11px] text-text-light tracking-wide mt-1">
            100% client-side &mdash; your files never leave your browser
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
