'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/* ─── Orbiting Constellation Data ─── */

const orbitItems = [
  { icon: '\u{1F5BC}', label: 'PNG', angle: 0 },
  { icon: '\u{1F3B5}', label: 'MP3', angle: 45 },
  { icon: '\u{1F4C4}', label: 'PDF', angle: 90 },
  { icon: '\u{1F3AC}', label: 'MP4', angle: 135 },
  { icon: '\u{1F4CA}', label: 'CSV', angle: 180 },
  { icon: '\u{1F310}', label: 'SVG', angle: 225 },
  { icon: '\u{1F4D6}', label: 'EPUB', angle: 270 },
  { icon: '\u{1F3A8}', label: 'PSD', angle: 315 },
];

const innerOrbitItems = [
  { icon: '\u{2728}', label: 'WebP', angle: 30 },
  { icon: '\u{1F4DD}', label: 'DOCX', angle: 120 },
  { icon: '\u{1F4BE}', label: 'JSON', angle: 210 },
  { icon: '\u{1F399}', label: 'WAV', angle: 300 },
];

/* ─── Format Ticker Data ─── */

const conversionPairs = [
  { from: 'PNG', to: 'WebP', icon: '\u{1F5BC}', color: '#f472b6' },
  { from: 'DOCX', to: 'PDF', icon: '\u{1F4C4}', color: '#60a5fa' },
  { from: 'MP4', to: 'GIF', icon: '\u{1F3AC}', color: '#fb923c' },
  { from: 'CSV', to: 'JSON', icon: '\u{1F4CA}', color: '#34d399' },
  { from: 'WAV', to: 'MP3', icon: '\u{1F3B5}', color: '#a78bfa' },
  { from: 'HEIC', to: 'JPG', icon: '\u{1F4F7}', color: '#f472b6' },
  { from: 'XLSX', to: 'CSV', icon: '\u{1F4CA}', color: '#34d399' },
  { from: 'TTF', to: 'WOFF2', icon: '\u{1F524}', color: '#2dd4bf' },
  { from: 'EPUB', to: 'PDF', icon: '\u{1F4D6}', color: '#60a5fa' },
  { from: 'YAML', to: 'JSON', icon: '\u{2699}', color: '#34d399' },
  { from: 'PSD', to: 'PNG', icon: '\u{1F3A8}', color: '#f472b6' },
  { from: 'MKV', to: 'MP4', icon: '\u{1F39E}', color: '#fb923c' },
];

/* ─── Conversion Flow Data ─── */

const flowSteps = [
  { inputIcon: '\u{1F5BC}', inputLabel: '.PNG', outputIcon: '\u{2728}', outputLabel: '.WebP' },
  { inputIcon: '\u{1F4C4}', inputLabel: '.DOCX', outputIcon: '\u{1F4D1}', outputLabel: '.PDF' },
  { inputIcon: '\u{1F3AC}', inputLabel: '.MKV', outputIcon: '\u{1F4F1}', outputLabel: '.MP4' },
  { inputIcon: '\u{1F4CA}', inputLabel: '.CSV', outputIcon: '\u{1F4CB}', outputLabel: '.JSON' },
  { inputIcon: '\u{1F3B5}', inputLabel: '.FLAC', outputIcon: '\u{1F3A7}', outputLabel: '.MP3' },
];

/* ─── Features ─── */

const features = [
  {
    icon: '\u{1F5BC}',
    title: 'Images',
    desc: 'PNG, JPG, WebP, GIF, BMP, AVIF, SVG, PSD, HEIC \u2014 convert between any format.',
    iconBg: 'bg-pink-100',
    formats: ['PNG', 'JPG', 'WebP', 'GIF', 'AVIF', 'SVG', 'PSD', 'HEIC'],
    wide: true,
  },
  {
    icon: '\u{1F4C4}',
    title: 'Documents',
    desc: 'DOCX, PDF, Markdown, HTML, TXT, PPTX, EPUB \u2014 preserves formatting.',
    iconBg: 'bg-blue-100',
    formats: ['DOCX', 'PDF', 'MD', 'HTML', 'TXT', 'PPTX', 'EPUB'],
    wide: false,
  },
  {
    icon: '\u{1F3B5}',
    title: 'Audio',
    desc: 'MP3, WAV, OGG, AAC, FLAC, M4A \u2014 powered by FFmpeg WebAssembly.',
    iconBg: 'bg-purple-100',
    formats: ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC'],
    wide: false,
  },
  {
    icon: '\u{1F3AC}',
    title: 'Video',
    desc: 'MP4, WebM, AVI, MOV, MKV \u2014 full video transcoding in your browser.',
    iconBg: 'bg-orange-100',
    formats: ['MP4', 'WebM', 'AVI', 'MOV', 'MKV'],
    wide: false,
  },
  {
    icon: '\u{1F4CA}',
    title: 'Data & Fonts',
    desc: 'CSV, JSON, XML, YAML, XLSX, TTF, OTF, WOFF2 \u2014 smart structure preservation.',
    iconBg: 'bg-emerald-100',
    formats: ['CSV', 'JSON', 'XML', 'YAML', 'XLSX', 'TTF', 'WOFF2'],
    wide: true,
  },
];

/* ─── Animation Variants ─── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ─── Orbiting Constellation Component ─── */

function OrbitingConstellation() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-50">
      {/* Center glow */}
      <div className="absolute w-20 h-20 rounded-full bg-pink/8 blur-xl" />
      <div className="absolute w-10 h-10 rounded-full bg-purple/10 blur-lg" />

      {/* Outer orbit ring (visual) */}
      <div className="absolute w-[720px] h-[720px] rounded-full border border-border-soft/40 hidden md:block" />
      {/* Inner orbit ring */}
      <div className="absolute w-[480px] h-[480px] rounded-full border border-border-soft/25 hidden md:block" />

      {/* Outer orbit items */}
      <div className="absolute w-[720px] h-[720px] hidden md:block animate-orbit-slow">
        {orbitItems.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const x = Math.cos(rad) * 360;
          const y = Math.sin(rad) * 360;
          return (
            <div
              key={item.label}
              className="absolute animate-counter-orbit-slow"
              style={{
                left: `calc(50% + ${x}px - 24px)`,
                top: `calc(50% + ${y}px - 24px)`,
              }}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-border-soft shadow-[0_2px_8px_rgba(160,120,80,0.06)] flex items-center justify-center text-lg">
                  {item.icon}
                </div>
                <span className="font-mono text-[9px] font-bold text-text-light tracking-wider">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inner orbit items */}
      <div className="absolute w-[480px] h-[480px] hidden md:block animate-orbit-med">
        {innerOrbitItems.map((item) => {
          const rad = (item.angle * Math.PI) / 180;
          const x = Math.cos(rad) * 240;
          const y = Math.sin(rad) * 240;
          return (
            <div
              key={item.label}
              className="absolute animate-counter-orbit-med"
              style={{
                left: `calc(50% + ${x}px - 18px)`,
                top: `calc(50% + ${y}px - 18px)`,
              }}
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-9 h-9 rounded-xl bg-white/80 border border-border-soft/60 shadow-[0_1px_4px_rgba(160,120,80,0.04)] flex items-center justify-center text-sm">
                  {item.icon}
                </div>
                <span className="font-mono text-[8px] font-bold text-text-light/70 tracking-wider">{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Format Ticker Component ─── */

function FormatTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % conversionPairs.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const pair = conversionPairs[index];

  return (
    <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-border-soft rounded-2xl shadow-[0_2px_8px_rgba(160,120,80,0.06)] min-w-[280px] justify-center">
      <span className="text-lg">{pair.icon}</span>
      <div className="flex items-center gap-2 font-mono text-sm font-bold overflow-hidden h-6">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={`from-${index}`}
            className="text-text-dark"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
          >
            .{pair.from}
          </motion.span>
        </AnimatePresence>
        <motion.span
          className="text-text-light"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {'\u2192'}
        </motion.span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={`to-${index}`}
            style={{ color: pair.color }}
            className="font-extrabold"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const, delay: 0.08 }}
          >
            .{pair.to}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Conversion Flow Animation ─── */

function ConversionFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % flowSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = flowSteps[step];

  return (
    <motion.div
      className="relative w-full max-w-[600px] mx-auto py-8"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Input file */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`in-${step}`}
            className="flex flex-col items-center gap-1.5"
            initial={{ x: -40, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-border-soft shadow-[0_4px_16px_rgba(160,120,80,0.08)] flex items-center justify-center text-2xl sm:text-3xl">
              {current.inputIcon}
            </div>
            <span className="font-mono text-[11px] font-bold text-text-mid">{current.inputLabel}</span>
          </motion.div>
        </AnimatePresence>

        {/* Arrow + bolt animation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Traveling dots */}
          <div className="relative w-12 sm:w-20 h-[2px] bg-border-soft overflow-hidden rounded">
            <motion.div
              className="absolute top-[-2px] w-2 h-2 rounded-full bg-pink"
              animate={{ x: [0, 48, 80], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-[-2px] w-1.5 h-1.5 rounded-full bg-purple"
              animate={{ x: [0, 48, 80], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />
          </div>

          {/* Center bolt */}
          <motion.div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-pink/30 shadow-[0_4px_20px_rgba(244,114,182,0.15)] flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
            animate={{
              scale: [1, 1.1, 1],
              borderColor: ['rgba(244,114,182,0.3)', 'rgba(167,139,250,0.4)', 'rgba(244,114,182,0.3)'],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {'\u26A1'}
          </motion.div>

          {/* More traveling dots */}
          <div className="relative w-12 sm:w-20 h-[2px] bg-border-soft overflow-hidden rounded">
            <motion.div
              className="absolute top-[-2px] w-2 h-2 rounded-full bg-purple"
              animate={{ x: [0, 48, 80], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            />
            <motion.div
              className="absolute top-[-2px] w-1.5 h-1.5 rounded-full bg-mint"
              animate={{ x: [0, 48, 80], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 1.0 }}
            />
          </div>
        </div>

        {/* Output file */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`out-${step}`}
            className="flex flex-col items-center gap-1.5"
            initial={{ x: 40, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 20, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const, delay: 0.15 }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-mint/30 shadow-[0_4px_16px_rgba(52,211,153,0.12)] flex items-center justify-center text-2xl sm:text-3xl">
              {current.outputIcon}
            </div>
            <span className="font-mono text-[11px] font-bold text-mint">{current.outputLabel}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen relative bg-bg-cream">
      {/* Atmospheric backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-pastel-mesh" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-dots" />

      {/* ──── NAV ──── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-bg-cream/80 backdrop-blur-xl border-b border-border-soft">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Transmute" className="w-8 h-8 rounded-[10px]" />
          <span className="font-serif font-extrabold text-xl tracking-tight text-text-dark">Transmute</span>
        </Link>
        <Link
          href="/convert"
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-pink rounded-2xl no-underline shadow-[0_4px_16px_rgba(244,114,182,0.3)] hover:shadow-[0_6px_24px_rgba(244,114,182,0.4)] hover:-translate-y-0.5 transition-all"
        >
          Open Converter
        </Link>
      </header>

      {/* ──── HERO ──── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-32 pb-20 text-center overflow-hidden">
        {/* Orbiting constellation behind hero text */}
        <OrbitingConstellation />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-0 z-10"
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 pl-2.5 bg-white border border-border-soft rounded-full text-sm font-medium text-text-mid shadow-[0_1px_3px_rgba(160,120,80,0.06)]"
            variants={fadeUp}
          >
            <span className="w-2 h-2 rounded-full bg-mint animate-badge-pulse" />
            100% client-side, forever free
          </motion.div>

          {/* Title */}
          <motion.h1
            className="font-serif font-black text-[clamp(48px,8vw,88px)] leading-[1.05] tracking-[-0.03em] text-text-dark max-w-[800px] mt-6"
            variants={fadeUp}
          >
            Convert <span className="text-pink">anything</span> to{' '}
            <span className="text-purple">everything</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-[clamp(16px,2.5vw,20px)] text-text-mid max-w-[520px] leading-relaxed mt-5"
            variants={fadeUp}
          >
            Drop images, docs, audio, video, or data files &mdash; get instant conversions
            right in your browser. No uploads. No accounts. No limits.
          </motion.p>

          {/* Format Ticker */}
          <motion.div className="mt-7" variants={fadeUp}>
            <FormatTicker />
          </motion.div>

          {/* CTAs */}
          <motion.div className="flex items-center gap-4 mt-8 flex-wrap justify-center" variants={fadeUp}>
            <Link
              href="/convert"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-bold text-white bg-pink rounded-2xl no-underline shadow-[0_4px_24px_rgba(244,114,182,0.3)] hover:shadow-[0_8px_36px_rgba(244,114,182,0.4)] hover:-translate-y-0.5 transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Start Converting
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-text-mid bg-transparent border-[1.5px] border-border-med rounded-2xl no-underline hover:text-text-dark hover:border-pink hover:bg-pink/10 transition-all"
            >
              See what&apos;s possible
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ──── CONVERSION FLOW ──── */}
      <section className="relative z-10 flex flex-col items-center px-6 -mt-10 mb-4">
        <motion.div
          className="text-center flex flex-col items-center gap-2 mb-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple/10 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wider text-purple">
            Live Preview
          </span>
          <p className="text-sm text-text-mid">Watch files transform in real time</p>
        </motion.div>
        <ConversionFlow />
      </section>

      {/* ──── FEATURES ──── */}
      <section
        id="features"
        className="relative z-10 flex flex-col items-center gap-10 px-6 py-20"
      >
        <motion.div
          className="text-center flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-pink/10 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wider text-pink">
            Formats
          </span>
          <h2 className="font-serif font-extrabold text-[clamp(32px,5vw,48px)] leading-[1.1] tracking-tight text-text-dark">
            Every format you need
          </h2>
          <p className="text-[17px] text-text-mid leading-relaxed max-w-[520px]">
            70+ file formats across 5 categories, all converted instantly with zero quality loss.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[960px] w-full"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {features.map((feat) => (
            <motion.div
              key={feat.title}
              className={`relative bg-white border border-border-soft rounded-3xl p-7 overflow-hidden shadow-[0_1px_3px_rgba(160,120,80,0.06)] hover:shadow-[0_12px_32px_rgba(160,120,80,0.1)] hover:-translate-y-1 hover:border-border-med transition-all duration-300 ${feat.wide ? 'md:col-span-2' : ''}`}
              variants={fadeUp}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] mb-4 ${feat.iconBg}`}>
                {feat.icon}
              </div>
              <h3 className="font-serif font-bold text-[19px] text-text-dark mb-2">{feat.title}</h3>
              <p className="text-sm text-text-mid leading-relaxed">{feat.desc}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {feat.formats.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 font-mono text-[11px] font-semibold rounded-full bg-bg-peach text-text-mid border border-border-soft"
                  >
                    .{f}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section className="relative z-10 flex flex-col items-center gap-10 px-6 py-10 pb-24">
        <motion.div
          className="text-center flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-pink/10 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wider text-pink">
            How it works
          </span>
          <h2 className="font-serif font-extrabold text-[clamp(32px,5vw,48px)] leading-[1.1] tracking-tight text-text-dark">
            Three steps. That&apos;s it.
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-[880px] w-full"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {[
            { num: '1', icon: '\u{1F4E5}', title: 'Drop your files', desc: 'Drag and drop any file \u2014 or click to browse. We accept everything.' },
            { num: '2', icon: '\u{2699}', title: 'Pick a format', desc: 'Choose your target format from smart suggestions based on file type.' },
            { num: '3', icon: '\u{2B07}', title: 'Download', desc: 'Hit convert and download instantly. Files never leave your browser.' },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              className="flex-1 relative bg-white border border-border-soft rounded-3xl p-8 text-center shadow-[0_1px_3px_rgba(160,120,80,0.06)] hover:shadow-[0_12px_32px_rgba(160,120,80,0.1)] hover:-translate-y-1 transition-all duration-300"
              variants={fadeUp}
            >
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="w-10 h-10 rounded-full inline-flex items-center justify-center font-serif font-extrabold text-lg text-white bg-pink mb-4">
                {step.num}
              </div>
              <h3 className="font-serif font-bold text-lg text-text-dark mb-2">{step.title}</h3>
              <p className="text-sm text-text-mid leading-relaxed">{step.desc}</p>
              {i < 2 && (
                <div className="absolute top-1/2 -right-5 -translate-y-1/2 text-text-light hidden md:block">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ──── PRIVACY ──── */}
      <section className="relative z-10 flex flex-col items-center px-6 pb-20">
        <motion.div
          className="relative max-w-[720px] w-full bg-white border-[1.5px] border-border-soft rounded-[32px] p-12 text-center shadow-[0_4px_12px_rgba(160,120,80,0.08)] overflow-hidden border-t-rainbow"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <div className="text-4xl mb-4">{'\u{1F6E1}'}</div>
          <h2 className="font-serif font-extrabold text-[28px] text-text-dark mb-3">Your files stay yours</h2>
          <p className="text-base text-text-mid leading-[1.7] max-w-[500px] mx-auto">
            Every conversion happens entirely in your browser using WebAssembly and Canvas APIs.
            No file ever touches a server. No data is collected. No account needed. Ever.
          </p>
          <div className="flex justify-center gap-6 mt-7 flex-wrap">
            {[
              { icon: '\u{1F6AB}', label: 'No uploads', color: 'bg-emerald-50' },
              { icon: '\u{1F4BB}', label: 'No servers', color: 'bg-blue-50' },
              { icon: '\u{1F440}', label: 'No tracking', color: 'bg-purple-50' },
              { icon: '\u{267E}', label: 'No limits', color: 'bg-orange-50' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-sm font-semibold text-text-mid">
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${b.color}`}>
                  <span className="text-base">{b.icon}</span>
                </div>
                {b.label}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ──── FOOTER CTA ──── */}
      <section className="relative z-10 flex flex-col items-center gap-6 px-6 pt-10 pb-6 text-center">
        <motion.h2
          className="font-serif font-extrabold text-[clamp(32px,5vw,48px)] leading-[1.1] tracking-tight text-text-dark"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Ready to transmute?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link
            href="/convert"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-bold text-white bg-pink rounded-2xl no-underline shadow-[0_4px_24px_rgba(244,114,182,0.3)] hover:shadow-[0_8px_36px_rgba(244,114,182,0.4)] hover:-translate-y-0.5 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Open Converter
          </Link>
        </motion.div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="text-center px-6 py-12 text-sm text-text-light">
        <p>
          Built with love, runs on your machine.
        </p>
      </footer>
    </div>
  );
}
