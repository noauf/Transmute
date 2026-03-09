'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

/* ─── Terminal Simulation Data ─── */

const terminalCommands = [
  { cmd: 'transmute photo.heic --to webp', output: '  \u2713 photo.webp (2.4 MB \u2192 680 KB)', color: '#f472b6', time: 1800 },
  { cmd: 'transmute report.docx --to pdf', output: '  \u2713 report.pdf (formatting preserved)', color: '#60a5fa', time: 2200 },
  { cmd: 'transmute song.flac --to mp3 --quality 320k', output: '  \u2713 song.mp3 (48 MB \u2192 9.2 MB)', color: '#a78bfa', time: 2800 },
  { cmd: 'transmute data.csv --to json', output: '  \u2713 data.json (2,847 rows parsed)', color: '#34d399', time: 1400 },
  { cmd: 'transmute clip.mov --to mp4', output: '  \u2713 clip.mp4 (H.264, browser-native)', color: '#fb923c', time: 3200 },
  { cmd: 'transmute design.psd --to png', output: '  \u2713 design.png (composite layer)', color: '#f472b6', time: 1600 },
  { cmd: 'transmute book.epub --to pdf', output: '  \u2713 book.pdf (chapters preserved)', color: '#60a5fa', time: 2000 },
  { cmd: 'transmute font.ttf --to woff2', output: '  \u2713 font.woff2 (compressed 62%)', color: '#34d399', time: 1200 },
  { cmd: 'transmute slides.pptx --to html', output: '  \u2713 slides.html (12 slides)', color: '#a78bfa', time: 2400 },
  { cmd: 'transmute sheet.xlsx --to csv', output: '  \u2713 sheet.csv (3 sheets merged)', color: '#34d399', time: 1500 },
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

/* ─── Terminal Simulation Component ─── */

interface TerminalLine {
  type: 'prompt' | 'output' | 'blank';
  text: string;
  color?: string;
}

function TerminalSimulation() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentTyping, setCurrentTyping] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const cmdIndexRef = useRef(0);
  const runningRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    runningRef.current = true;

    const typeCommand = async (cmdObj: typeof terminalCommands[0]) => {
      if (!runningRef.current) return;

      // Type the command character by character
      setIsTyping(true);
      for (let i = 0; i <= cmdObj.cmd.length; i++) {
        if (!runningRef.current) return;
        setCurrentTyping(cmdObj.cmd.slice(0, i));
        await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
      }

      // Brief pause after typing
      await new Promise((r) => setTimeout(r, 300));
      if (!runningRef.current) return;

      // "Execute" — move command to lines, show output
      setIsTyping(false);
      setCurrentTyping('');
      setLines((prev) => [
        ...prev,
        { type: 'prompt', text: cmdObj.cmd },
        { type: 'output', text: cmdObj.output, color: cmdObj.color },
      ]);
      scrollToBottom();

      // Pause before next command
      await new Promise((r) => setTimeout(r, 1200));
    };

    const runLoop = async () => {
      // Small initial delay
      await new Promise((r) => setTimeout(r, 800));

      while (runningRef.current) {
        const cmd = terminalCommands[cmdIndexRef.current % terminalCommands.length];
        await typeCommand(cmd);
        cmdIndexRef.current++;

        // After showing 6 commands, clear and start fresh to prevent infinite growth
        if (cmdIndexRef.current % 6 === 0) {
          await new Promise((r) => setTimeout(r, 600));
          if (!runningRef.current) return;
          setLines([]);
        }
      }
    };

    runLoop();

    return () => {
      runningRef.current = false;
    };
  }, [scrollToBottom]);

  // Auto-scroll on new lines
  useEffect(() => {
    scrollToBottom();
  }, [lines, currentTyping, scrollToBottom]);

  return (
    <div className="w-full max-w-[700px] mx-auto">
      {/* Terminal window */}
      <div className="rounded-xl overflow-hidden shadow-[0_8px_60px_rgba(0,0,0,0.25)] border border-white/[0.06]">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a2e]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center font-mono text-[11px] text-white/30 tracking-wider">
            transmute
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={termRef}
          className="bg-[#0f0f1a] px-5 py-4 h-[320px] overflow-y-auto font-mono text-[13px] leading-[1.8] scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Welcome message */}
          <div className="text-white/20 mb-2 select-none">
            Transmute v1.0 {'\u2014'} 70+ formats, zero uploads
          </div>

          {/* Completed lines */}
          {lines.map((line, i) => (
            <div key={i}>
              {line.type === 'prompt' ? (
                <div className="flex items-start gap-0">
                  <span className="text-[#34d399] select-none">{'>'}</span>
                  <span className="text-white/80 ml-2">{line.text}</span>
                </div>
              ) : line.type === 'output' ? (
                <div style={{ color: line.color }} className="opacity-90">
                  {line.text}
                </div>
              ) : null}
            </div>
          ))}

          {/* Currently typing line */}
          {(isTyping || currentTyping) && (
            <div className="flex items-start gap-0">
              <span className="text-[#34d399] select-none">{'>'}</span>
              <span className="text-white/80 ml-2">{currentTyping}</span>
              <span className="inline-block w-[2px] h-[16px] bg-[#34d399] ml-[1px] translate-y-[2px] animate-pulse" />
            </div>
          )}

          {/* Idle cursor */}
          {!isTyping && !currentTyping && (
            <div className="flex items-start gap-0">
              <span className="text-[#34d399] select-none">{'>'}</span>
              <span className="inline-block w-[2px] h-[16px] bg-[#34d399] ml-2 translate-y-[2px] animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Format count below terminal */}
      <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
        {[
          { label: 'Images', count: 11, color: '#f472b6' },
          { label: 'Documents', count: 8, color: '#60a5fa' },
          { label: 'Audio/Video', count: 11, color: '#a78bfa' },
          { label: 'Data/Fonts', count: 14, color: '#34d399' },
        ].map((cat) => (
          <div key={cat.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
            <span className="font-mono text-[11px] text-text-mid">
              <strong style={{ color: cat.color }}>{cat.count}</strong> {cat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
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

      {/* ──── FEATURES — TERMINAL SIMULATION ──── */}
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
            70+ file formats. Drop anything in, get anything out.
          </p>
        </motion.div>

        <motion.div
          className="w-full max-w-[700px]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <TerminalSimulation />
        </motion.div>

        <motion.p
          className="text-sm text-text-light font-mono tracking-wide"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          70+ formats supported &mdash; and counting
        </motion.p>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section className="relative z-10 flex flex-col items-center px-6 py-10 pb-24">
        <motion.div
          className="text-center flex flex-col items-center gap-3 mb-14"
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

        {/* Timeline layout */}
        <div className="relative max-w-[960px] w-full">
          {/* Connecting line — desktop only */}
          <div className="absolute top-[52px] left-[calc(8.33%+24px)] right-[calc(8.33%+24px)] h-[2px] bg-border-soft hidden md:block" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">
            {/* Step 1 — Drop */}
            <motion.div
              className="flex flex-col items-center text-center px-4"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {/* Visual scene */}
              <div className="relative w-[104px] h-[104px] mb-5">
                {/* Background shape */}
                <div className="absolute inset-0 rounded-[28px] bg-pink/8 rotate-3" />
                <div className="relative w-full h-full rounded-[28px] bg-white border-2 border-pink/20 shadow-[0_4px_20px_rgba(244,114,182,0.1)] flex items-center justify-center -rotate-1">
                  {/* File stack */}
                  <div className="relative">
                    <div className="absolute -top-1 -left-1 w-10 h-12 rounded-lg bg-pink/10 border border-pink/15 rotate-[-6deg]" />
                    <div className="absolute -top-0.5 left-0 w-10 h-12 rounded-lg bg-pink/8 border border-pink/12 rotate-[-3deg]" />
                    <div className="relative w-10 h-12 rounded-lg bg-white border-[1.5px] border-pink/25 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-pink">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              {/* Number + text */}
              <div className="w-8 h-8 rounded-full bg-pink flex items-center justify-center font-serif font-extrabold text-sm text-white mb-3 shadow-[0_2px_8px_rgba(244,114,182,0.3)]">
                1
              </div>
              <h3 className="font-serif font-bold text-[17px] text-text-dark mb-1.5">Drop your files</h3>
              <p className="text-[13px] text-text-mid leading-relaxed max-w-[220px]">
                Drag and drop anything {'\u2014'} images, docs, audio, video, data. We handle 70+ formats.
              </p>
            </motion.div>

            {/* Step 2 — Pick */}
            <motion.div
              className="flex flex-col items-center text-center px-4"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {/* Visual scene */}
              <div className="relative w-[104px] h-[104px] mb-5">
                <div className="absolute inset-0 rounded-[28px] bg-purple/8 -rotate-2" />
                <div className="relative w-full h-full rounded-[28px] bg-white border-2 border-purple/20 shadow-[0_4px_20px_rgba(167,139,250,0.1)] flex items-center justify-center rotate-1">
                  {/* Format picker mini-UI */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[42px] h-[14px] rounded-md bg-purple/15 border border-purple/20" />
                      <div className="w-3 h-3 rounded-full bg-purple/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-[42px] h-[14px] rounded-md bg-purple/8 border border-purple/10" />
                      <div className="w-3 h-3 rounded-full border border-purple/20" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-[42px] h-[14px] rounded-md bg-purple/8 border border-purple/10" />
                      <div className="w-3 h-3 rounded-full border border-purple/20" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Number + text */}
              <div className="w-8 h-8 rounded-full bg-purple flex items-center justify-center font-serif font-extrabold text-sm text-white mb-3 shadow-[0_2px_8px_rgba(167,139,250,0.3)]">
                2
              </div>
              <h3 className="font-serif font-bold text-[17px] text-text-dark mb-1.5">Pick a format</h3>
              <p className="text-[13px] text-text-mid leading-relaxed max-w-[220px]">
                Smart suggestions based on your file type. Or choose any compatible output format.
              </p>
            </motion.div>

            {/* Step 3 — Download */}
            <motion.div
              className="flex flex-col items-center text-center px-4"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              {/* Visual scene */}
              <div className="relative w-[104px] h-[104px] mb-5">
                <div className="absolute inset-0 rounded-[28px] bg-mint/8 rotate-2" />
                <div className="relative w-full h-full rounded-[28px] bg-white border-2 border-mint/20 shadow-[0_4px_20px_rgba(52,211,153,0.1)] flex items-center justify-center -rotate-1">
                  {/* Checkmark + download visual */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-mint/10 border-[1.5px] border-mint/25 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-mint">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    {/* Tiny sparkles */}
                    <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-mint/30" />
                    <div className="absolute -bottom-1 -left-2 w-2 h-2 rounded-full bg-mint/20" />
                  </div>
                </div>
              </div>
              {/* Number + text */}
              <div className="w-8 h-8 rounded-full bg-mint flex items-center justify-center font-serif font-extrabold text-sm text-white mb-3 shadow-[0_2px_8px_rgba(52,211,153,0.3)]">
                3
              </div>
              <h3 className="font-serif font-bold text-[17px] text-text-dark mb-1.5">Download</h3>
              <p className="text-[13px] text-text-mid leading-relaxed max-w-[220px]">
                Converted instantly in your browser. Hit download {'\u2014'} done. Files never leave your machine.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──── PRIVACY ──── */}
      <section className="relative z-10 flex justify-center px-6 pb-20">
        <motion.div
          className="relative max-w-[960px] w-full flex flex-col md:flex-row items-center gap-10 md:gap-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        >
          {/* Left — Shield visual */}
          <div className="relative flex-shrink-0 w-[200px] h-[200px] md:w-[260px] md:h-[260px] flex items-center justify-center">
            {/* Pulsing rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-mint/20"
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-4 rounded-full border-2 border-mint/15"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.08, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
            {/* Shield body */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 bg-white rounded-[28px] border-2 border-mint/25 shadow-[0_8px_40px_rgba(52,211,153,0.12)] flex items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-mint md:w-[64px] md:h-[64px]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(52,211,153,0.08)" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Right — Text + privacy points */}
          <div className="flex flex-col text-center md:text-left">
            <span className="inline-flex self-center md:self-start items-center gap-2 px-3.5 py-1.5 bg-mint/10 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wider text-mint mb-4">
              Privacy First
            </span>
            <h2 className="font-serif font-extrabold text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-tight text-text-dark mb-3">
              Your files stay yours
            </h2>
            <p className="text-[15px] text-text-mid leading-[1.7] max-w-[440px]">
              Every conversion happens entirely in your browser using WebAssembly and Canvas APIs.
              No file ever touches a server. No data is collected. No account needed.
            </p>

            {/* Privacy points — stacked vertically */}
            <div className="grid grid-cols-2 gap-3 mt-7">
              {[
                { icon: '\u{1F512}', label: 'No uploads', desc: 'Files stay on your device', accent: '#34d399' },
                { icon: '\u{1F6AB}', label: 'No servers', desc: 'Zero network requests', accent: '#60a5fa' },
                { icon: '\u{1F440}', label: 'No tracking', desc: 'No analytics or cookies', accent: '#a78bfa' },
                { icon: '\u{267E}\uFE0F', label: 'No limits', desc: 'Unlimited file size & count', accent: '#fb923c' },
              ].map((point) => (
                <div
                  key={point.label}
                  className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-border-soft shadow-[0_1px_3px_rgba(160,120,80,0.04)]"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[16px]"
                    style={{ background: `${point.accent}12` }}
                  >
                    {point.icon}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-text-dark">{point.label}</div>
                    <div className="text-[11px] text-text-light leading-snug">{point.desc}</div>
                  </div>
                </div>
              ))}
            </div>
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
