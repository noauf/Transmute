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
  if (hasFiles) {
    return (
      <div
        className="drop-zone-compact"
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
          className={`compact-drop-area ${isDragging ? 'dragging' : ''}`}
          onClick={onBrowse}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Drop more files or click to browse</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="drop-zone-hero"
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
        className={`drop-zone-inner ${isDragging ? 'dragging' : ''}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: isDragging ? 1.02 : 1,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Animated corner accents */}
        <div className="corner-accent top-left" />
        <div className="corner-accent top-right" />
        <div className="corner-accent bottom-left" />
        <div className="corner-accent bottom-right" />

        <motion.div
          className="drop-zone-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Upload icon */}
          <motion.div
            className="upload-icon"
            animate={{
              y: isDragging ? -8 : 0,
              scale: isDragging ? 1.15 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
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

          <h2 className="drop-zone-title">
            {isDragging ? 'Release to transmute' : 'Drop anything.'}
          </h2>
          <p className="drop-zone-subtitle">
            {isDragging
              ? 'Your files are ready for transformation'
              : 'Images, documents, audio, video, data \u2014 all formats welcome'}
          </p>

          <motion.button
            className="browse-button"
            onClick={onBrowse}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Browse files
          </motion.button>

          <p className="drop-zone-hint">
            100% client-side \u2014 your files never leave your browser
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
