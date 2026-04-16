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
  { label: "IMG", color: "bg-pink/10 text-pink" },
  { label: "PDF", color: "bg-orange/10 text-orange" },
  { label: "MP4", color: "bg-purple/10 text-purple" },
  { label: "MP3", color: "bg-blue/10 text-blue" },
  { label: "SVG", color: "bg-teal/10 text-teal" },
  { label: "CSV", color: "bg-mint/10 text-mint" },
  { label: "DOCX", color: "bg-orange/10 text-orange" },
  { label: "+60", color: "bg-[#f6f6f6] text-text-light" },
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
      <motion.div
        className="flex w-full max-w-lg flex-col items-center text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
      >
        {/* Card */}
        <div
          className={`w-full flex flex-col items-center gap-5 sm:gap-6 px-8 sm:px-12 py-10 sm:py-12 rounded-2xl border transition-all duration-300 ${
            isDragging
              ? "bg-pink/[0.03] border-pink/20 shadow-[0_8px_40px_rgba(244,114,182,0.12)]"
              : "bg-white border-border-soft shadow-[0_4px_24px_rgba(45,31,20,0.07)]"
          }`}
        >
          {/* Upload icon — gradient bg + glow */}
          <motion.div
            className={`flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl transition-all duration-300 ${
              isDragging
                ? "shadow-[0_0_40px_rgba(244,114,182,0.4)]"
                : "shadow-[0_0_32px_rgba(244,114,182,0.2)]"
            }`}
            style={{
              background: isDragging
                ? "linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)"
                : "linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)",
            }}
            animate={{
              y: isDragging ? -6 : 0,
              rotate: isDragging ? -3 : 0,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 48 48"
              fill="none"
              className="sm:w-10 sm:h-10"
            >
              <path
                d="M24 32V12M24 12L16 20M24 12L32 20"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 28v8a4 4 0 004 4h24a4 4 0 004-4v-8"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Heading + subtitle */}
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-text-dark tracking-tight mb-2">
              {isDragging ? "Release to add" : "Drop files here"}
            </h2>
            <p className="text-text-mid text-sm sm:text-base leading-relaxed">
              {isDragging
                ? "Your files are ready for transformation"
                : "Images, documents, audio, video, data — all formats welcome"}
            </p>
          </div>

          {/* Format pills */}
          {!isDragging && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {FORMAT_PILLS.map(({ label, color }) => (
                <span
                  key={label}
                  className={`font-mono text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full ${color}`}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Browse button */}
          <motion.button
            className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-bold text-white bg-pink rounded-2xl cursor-pointer shadow-[0_6px_24px_rgba(244,114,182,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(244,114,182,0.35)] active:scale-[0.97] transition-all border-none"
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

          {/* Trust signal */}
          <p className="font-mono text-[11px] text-text-light/60 tracking-wide -mt-1">
            70+ formats &mdash; 100% client-side
          </p>
        </div>
      </motion.div>
    </div>
  );
}
