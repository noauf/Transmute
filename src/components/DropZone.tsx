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

export function DropZone({
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onBrowse,
}: DropZoneProps) {
  // Empty state inside Finder window
  return (
    <div
      className="flex min-h-full items-center justify-center px-6 sm:px-10 py-12 sm:py-20"
      style={{ minHeight: "100%" }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <motion.div
        className="flex w-full max-w-2xl flex-col items-center gap-5 sm:gap-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
      >
        {/* Upload icon */}
        <motion.div
          className={`flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-3xl transition-all duration-300 ${
            isDragging
              ? "bg-pink/12 text-pink scale-110"
              : "bg-[#f6f6f6] text-text-light"
          }`}
          animate={{
            y: isDragging ? -8 : 0,
            rotate: isDragging ? -3 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 48 48"
            fill="none"
            className="sm:w-12 sm:h-12"
          >
            <path
              d="M24 32V12M24 12L16 20M24 12L32 20"
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

        <div className="max-w-xl">
          <h2 className="font-serif text-3xl sm:text-5xl font-extrabold text-text-dark tracking-tight mb-3">
            {isDragging ? "Release to add" : "Drop files here"}
          </h2>
          <p className="text-text-mid text-base sm:text-xl max-w-xl leading-relaxed">
            {isDragging
              ? "Your files are ready for transformation"
              : "Images, documents, audio, video, data — all formats welcome"}
          </p>
        </div>

        <motion.button
          className="inline-flex items-center gap-2.5 mt-2 px-7 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-bold text-white bg-pink rounded-2xl cursor-pointer shadow-[0_6px_24px_rgba(244,114,182,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(244,114,182,0.35)] active:scale-[0.97] transition-all border-none"
          onClick={onBrowse}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Browse files
        </motion.button>

        <p className="font-mono text-xs sm:text-sm text-text-light/60 tracking-wide mt-2">
          70+ formats &mdash; 100% client-side
        </p>
      </motion.div>
    </div>
  );
}
