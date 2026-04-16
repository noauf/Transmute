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

const FORMAT_PILLS = [
  { label: "JPG", color: "bg-pink/10 text-pink" },
  { label: "PDF", color: "bg-orange/10 text-orange" },
  { label: "MP4", color: "bg-purple/10 text-purple" },
  { label: "MP3", color: "bg-blue/10 text-blue" },
  { label: "SVG", color: "bg-teal/10 text-teal" },
  { label: "CSV", color: "bg-mint/10 text-mint" },
  { label: "+64", color: "bg-[#f0ede8] text-text-light" },
];

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
      className="flex min-h-full items-center justify-center px-6 sm:px-10 py-12 sm:py-20"
      style={{ minHeight: "100%" }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">

        {/* Icon */}
        <motion.div
          className="flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex-shrink-0"
          style={{
            background: isDragging ? "rgba(244,114,182,0.12)" : "#f6f6f6",
            boxShadow: isDragging
              ? "0 0 0 6px rgba(244,114,182,0.08)"
              : "none",
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={
            isDragging
              ? { opacity: 1, scale: 1.08, y: -8, rotate: -3 }
              : { opacity: 1, scale: 1, y: [0, -7, 0], rotate: 0 }
          }
          transition={
            isDragging
              ? { type: "spring", stiffness: 280, damping: 18 }
              : {
                  opacity: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                }
          }
        >
          <svg width="38" height="38" viewBox="0 0 48 48" fill="none" className="sm:w-11 sm:h-11">
            <path
              d="M24 32V12M24 12L16 20M24 12L32 20"
              stroke={isDragging ? "#f472b6" : "#b8a08a"}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 28v8a4 4 0 004 4h24a4 4 0 004-4v-8"
              stroke={isDragging ? "#f472b6" : "#b8a08a"}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Heading + subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-serif text-4xl sm:text-5xl font-extrabold text-text-dark tracking-tight mb-3">
            {isDragging ? "Release to add" : "Drop files here"}
          </h2>
          <p className="text-text-mid text-base sm:text-lg max-w-sm leading-relaxed">
            {isDragging
              ? "Your files are ready for transformation"
              : "Images, documents, audio, video, data — all formats welcome"}
          </p>
        </motion.div>

        {/* Format pills */}
        {!isDragging && (
          <motion.div
            className="flex items-center justify-center gap-1.5 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.18 }}
          >
            {FORMAT_PILLS.map(({ label, color }, i) => (
              <motion.span
                key={label}
                className={`font-mono text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full ${color}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.2 + i * 0.04,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {label}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Browse button */}
        <motion.button
          className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-bold text-white bg-pink rounded-2xl cursor-pointer border-none shadow-[0_6px_24px_rgba(244,114,182,0.28)]"
          onClick={onBrowse}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.04, boxShadow: "0 8px_32px rgba(244,114,182,0.42)" }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Browse files
        </motion.button>

        {/* Trust signal */}
        <motion.p
          className="font-mono text-xs sm:text-sm text-text-light/60 tracking-wide -mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.34 }}
        >
          70+ formats &mdash; 100% client-side
        </motion.p>

      </div>
    </div>
  );
}
