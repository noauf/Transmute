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
  { label: "DOCX", color: "bg-orange/10 text-orange" },
  { label: "+60", color: "bg-[#f0ede8] text-text-light" },
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
      className="relative flex min-h-full w-full items-center justify-center overflow-hidden px-5 py-10"
      style={{ minHeight: "100%" }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Animated ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-1/3 -left-1/4 w-3/4 h-3/4 rounded-full bg-pink/[0.13] blur-[90px]"
        animate={{ x: [0, 25, 0], y: [0, -18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-1/3 -right-1/4 w-3/4 h-3/4 rounded-full bg-purple/[0.10] blur-[90px]"
        animate={{ x: [0, -25, 0], y: [0, 18, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full bg-orange/[0.06] blur-[70px]"
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Glass card */}
      <motion.div
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-5 sm:gap-6 px-7 sm:px-10 py-8 sm:py-10 text-center rounded-3xl backdrop-blur-2xl"
        style={{
          background: isDragging
            ? "rgba(255,255,255,0.82)"
            : "rgba(255,255,255,0.72)",
          border: isDragging
            ? "1px solid rgba(244,114,182,0.35)"
            : "1px solid rgba(255,255,255,0.9)",
          boxShadow: isDragging
            ? "0 0 0 5px rgba(244,114,182,0.08), 0 16px 56px rgba(244,114,182,0.14)"
            : "0 8px 48px rgba(45,31,20,0.10), 0 1px 0 rgba(255,255,255,0.8) inset",
        }}
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Floating icon */}
        <motion.div
          className="flex items-center justify-center w-[68px] h-[68px] sm:w-20 sm:h-20 rounded-2xl flex-shrink-0"
          style={{
            background: isDragging
              ? "linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)"
              : "linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)",
            boxShadow: isDragging
              ? "0 0 0 8px rgba(244,114,182,0.14), 0 14px 40px rgba(244,114,182,0.45)"
              : "0 8px 32px rgba(244,114,182,0.28)",
          }}
          animate={
            isDragging
              ? { y: -10, rotate: -5, scale: 1.1 }
              : { y: [0, -8, 0] }
          }
          transition={
            isDragging
              ? { type: "spring", stiffness: 280, damping: 18 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <svg width="30" height="30" viewBox="0 0 48 48" fill="none" className="sm:w-9 sm:h-9">
            <path
              d="M24 32V12M24 12L16 20M24 12L32 20"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 28v8a4 4 0 004 4h24a4 4 0 004-4v-8"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* Heading + subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-serif text-[1.65rem] sm:text-[2rem] font-extrabold text-text-dark tracking-tight mb-1.5 leading-tight">
            {isDragging ? "Release to add" : "Drop files here"}
          </h2>
          <p className="text-text-mid text-sm leading-relaxed">
            {isDragging
              ? "Your files are ready for transformation"
              : "Images, documents, audio, video, data"}
          </p>
        </motion.div>

        {/* Format pills */}
        {!isDragging && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {FORMAT_PILLS.map(({ label, color }, i) => (
              <motion.span
                key={label}
                className={`font-mono text-[10px] font-semibold tracking-wide px-2.5 py-[5px] rounded-full ${color}`}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.35,
                  delay: 0.18 + i * 0.045,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {label}
              </motion.span>
            ))}
          </div>
        )}

        {/* Browse button */}
        <motion.button
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-pink rounded-xl cursor-pointer border-none shadow-[0_4px_20px_rgba(244,114,182,0.32)]"
          onClick={onBrowse}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 8px 28px rgba(244,114,182,0.46)",
          }}
          whileTap={{ scale: 0.96 }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Browse files
        </motion.button>

        {/* Trust signal */}
        <motion.p
          className="font-mono text-[10px] text-text-light/50 tracking-wide -mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.42 }}
        >
          70+ formats &mdash; 100% client-side
        </motion.p>
      </motion.div>
    </div>
  );
}
