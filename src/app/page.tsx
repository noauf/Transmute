'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const floatingBadges = [
  { label: 'PNG', color: 'bg-pink-200', dot: 'bg-pink-400', top: '18%', left: '8%', delay: 0 },
  { label: 'MP4', color: 'bg-orange-100', dot: 'bg-orange-400', top: '22%', right: '10%', delay: 0.5 },
  { label: 'CSV', color: 'bg-emerald-100', dot: 'bg-emerald-400', bottom: '32%', left: '6%', delay: 1.0 },
  { label: 'PDF', color: 'bg-blue-100', dot: 'bg-blue-400', bottom: '28%', right: '8%', delay: 0.3 },
  { label: 'WAV', color: 'bg-purple-100', dot: 'bg-purple-400', top: '42%', left: '3%', delay: 0.7 },
  { label: 'WEBP', color: 'bg-pink-100', dot: 'bg-pink-400', top: '35%', right: '4%', delay: 1.2 },
];

const features = [
  {
    icon: '\u{1F5BC}',
    title: 'Images',
    desc: 'PNG, JPG, WebP, GIF, BMP, AVIF, SVG \u2014 convert between any format using Canvas API.',
    bg: 'bg-pink-50',
    iconBg: 'bg-pink-100',
    formats: ['PNG', 'JPG', 'WebP', 'GIF', 'AVIF', 'SVG'],
    wide: true,
  },
  {
    icon: '\u{1F4C4}',
    title: 'Documents',
    desc: 'DOCX, PDF, Markdown, HTML, TXT \u2014 preserves formatting with styled rendering.',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    formats: ['DOCX', 'PDF', 'MD', 'HTML', 'TXT'],
    wide: false,
  },
  {
    icon: '\u{1F3B5}',
    title: 'Audio',
    desc: 'MP3, WAV, OGG, AAC, FLAC, M4A \u2014 powered by FFmpeg WebAssembly.',
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    formats: ['MP3', 'WAV', 'OGG', 'FLAC'],
    wide: false,
  },
  {
    icon: '\u{1F3AC}',
    title: 'Video',
    desc: 'MP4, WebM, AVI, MOV, MKV \u2014 full video transcoding in your browser.',
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    formats: ['MP4', 'WebM', 'AVI', 'MOV'],
    wide: false,
  },
  {
    icon: '\u{1F4CA}',
    title: 'Data',
    desc: 'CSV, JSON, XML, YAML, TSV \u2014 smart parsing with structure preservation.',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    formats: ['CSV', 'JSON', 'XML', 'YAML', 'TSV'],
    wide: true,
  },
];

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

export default function LandingPage() {
  return (
    <div className="min-h-screen relative bg-bg-cream">
      {/* Atmospheric backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-pastel-mesh" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-dots" />

      {/* ──── NAV ──── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-bg-cream/80 backdrop-blur-xl border-b border-border-soft">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
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
        {/* Floating format badges */}
        {floatingBadges.map((badge) => (
          <motion.div
            key={badge.label}
            className="absolute hidden md:flex items-center gap-1.5 px-3.5 py-2 bg-white border border-border-soft rounded-2xl font-mono text-xs font-semibold text-text-mid shadow-[0_4px_12px_rgba(160,120,80,0.08)] pointer-events-none select-none"
            style={{
              top: badge.top,
              bottom: badge.bottom,
              left: badge.left,
              right: badge.right,
            } as React.CSSProperties}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + badge.delay, duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-sm ${badge.dot}`} />
              .{badge.label}
            </div>
          </motion.div>
        ))}

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

          {/* CTAs */}
          <motion.div className="flex items-center gap-4 mt-10 flex-wrap justify-center" variants={fadeUp}>
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
            40+ file formats across 5 categories, all converted instantly with zero quality loss.
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
            { num: '1', title: 'Drop your files', desc: 'Drag and drop any file \u2014 or click to browse. We accept everything.' },
            { num: '2', title: 'Pick a format', desc: 'Choose your target format from smart suggestions based on file type.' },
            { num: '3', title: 'Download', desc: 'Hit convert and download instantly. Files never leave your browser.' },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              className="flex-1 relative bg-white border border-border-soft rounded-3xl p-8 text-center shadow-[0_1px_3px_rgba(160,120,80,0.06)] hover:shadow-[0_12px_32px_rgba(160,120,80,0.1)] hover:-translate-y-1 transition-all duration-300"
              variants={fadeUp}
            >
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
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2d1f14" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-serif font-extrabold text-[28px] text-text-dark mb-3">Your files stay yours</h2>
          <p className="text-base text-text-mid leading-[1.7] max-w-[500px] mx-auto">
            Every conversion happens entirely in your browser using WebAssembly and Canvas APIs.
            No file ever touches a server. No data is collected. No account needed. Ever.
          </p>
          <div className="flex justify-center gap-6 mt-7 flex-wrap">
            {[
              { label: 'No uploads', color: 'bg-emerald-50', stroke: '#34d399' },
              { label: 'No servers', color: 'bg-blue-50', stroke: '#60a5fa' },
              { label: 'No tracking', color: 'bg-purple-50', stroke: '#a78bfa' },
              { label: 'No limits', color: 'bg-orange-50', stroke: '#fb923c' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-sm font-semibold text-text-mid">
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${b.color}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={b.stroke} strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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
