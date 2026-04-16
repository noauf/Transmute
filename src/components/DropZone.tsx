"use client";

import { motion } from "framer-motion";
import React from "react";

interface DropZoneProps {
  isDragging: boolean;
  hasFiles: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowse: () => void;
}

const WORDS = ["Drop", "files", "here"];

export function DropZone({
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onBrowse,
}: DropZoneProps) {
  return (
    <div
      className="flex min-h-full w-full flex-col items-center justify-center px-6 py-10 select-none"
      style={{ minHeight: "100%" }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Poster headline */}
      <div className="flex flex-col items-center leading-none mb-10">
        {WORDS.map((word, i) => (
          <motion.span
            key={word}
            className="font-serif font-extrabold tracking-tight block"
            style={{ fontSize: "clamp(3.5rem, 16vw, 14rem)" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              color: isDragging ? "#f472b6" : "#2d1f14",
            }}
            transition={{
              opacity: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
              color: { duration: 0.3 },
            }}
          >
            {word}
          </motion.span>
        ))}
      </div>

      {/* Browse button — small and understated */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <motion.button
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-pink rounded-xl cursor-pointer border-none shadow-[0_4px_16px_rgba(244,114,182,0.3)] hover:shadow-[0_6px_24px_rgba(244,114,182,0.4)] transition-shadow"
          onClick={onBrowse}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Browse files
        </motion.button>

        <p className="font-mono text-[10px] text-text-light/50 tracking-wide">
          70+ formats &mdash; 100% client-side
        </p>
      </motion.div>
    </div>
  );
}
