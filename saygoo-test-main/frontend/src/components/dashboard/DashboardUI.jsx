import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Home, LogOut, Search, X } from 'lucide-react';

import bgWave from '../../assets/saygo-wave.jpg';
import logoHeader from '../../assets/Typo 2.png';

export function DashboardShell({
  badge,
  title,
  subtitle,
  session,
  onHome,
  onLogout,
  actionSlot,
  children,
}) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#150D08] text-white"
      style={{
        backgroundImage: `url(${bgWave})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-[#150D08]/92" />
      <div className="absolute left-[-12rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#F36F21]/14 blur-3xl" />
      <div className="absolute right-[-8rem] top-28 h-[24rem] w-[24rem] rounded-full bg-[#FFF0E6]/6 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-[#F36F21]/10 blur-3xl" />

      <header className="relative z-10 border-b border-white/6 bg-[#1B120C]/72 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <img src={logoHeader} alt="SAYGOO" className="h-auto w-28 md:w-32" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#FFBC82]">
                {badge}
              </p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/62 md:text-base">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            <div className="flex flex-wrap items-center gap-3">
              <GhostButton onClick={onHome} icon={Home}>
                Accueil
              </GhostButton>
              {actionSlot}
              <GhostButton onClick={onLogout} icon={LogOut}>
                Deconnexion
              </GhostButton>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">
              <span>{session?.profile?.companyName || 'Saygoo Network'}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#F36F21]" />
              <span>{session?.profile?.fullName || session?.email || 'Session active'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 py-8 sm:px-8 md:py-10">{children}</main>
    </div>
  );
}

export function SpotlightCard({
  children,
  className = '',
  glow = 'rgba(243,111,33,0.18)',
  hover = true,
  ...motionProps
}) {
  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = `${event.clientX - bounds.left}px`;
    const y = `${event.clientY - bounds.top}px`;
    event.currentTarget.style.setProperty('--spot-x', x);
    event.currentTarget.style.setProperty('--spot-y', y);
  };

  const motionHover = hover ? { y: -6, scale: 1.01 } : undefined;

  return (
    <motion.section
      {...motionProps}
      onMouseMove={handleMove}
      className={`group relative overflow-hidden rounded-2xl border border-white/6 bg-[rgba(42,26,16,0.72)] shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-colors duration-300 hover:border-[#F36F21]/40 ${className}`}
      style={{
        '--spot-x': '50%',
        '--spot-y': '50%',
      }}
      whileHover={motionHover}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_34%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at var(--spot-x) var(--spot-y), ${glow}, transparent 42%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/10" />
      <div className="relative z-10 h-full">{children}</div>
    </motion.section>
  );
}

export function SectionIntro({ badge, title, description, aside }) {
  return (
    <SpotlightCard className="p-6 md:p-8" hover={false}>
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr] xl:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#FFBC82]">{badge}</p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-[0.92] text-white md:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/68 md:text-base">
            {description}
          </p>
        </div>
        {aside}
      </div>
    </SpotlightCard>
  );
}

export function SegmentedPills({ options, value, onChange, layoutId = 'dashboard-pill' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`relative overflow-hidden rounded-lg border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${
              isActive
                ? 'border-[#F36F21]/40 text-white'
                : 'border-white/8 bg-white/[0.03] text-white/55 hover:border-white/16 hover:text-white/78'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-[#F36F21]/18"
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              />
            )}
            <span className="relative z-10">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MetricTile({ label, value, detail, accent = 'text-[#FFBC82]' }) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/40">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accent}`}>{value}</p>
      {detail ? <p className="mt-2 text-sm text-white/56">{detail}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, label, detail, tone = 'from-[#F36F21] to-[#FFBC82]' }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/42">{label}</p>
          {detail ? <p className="mt-1 text-sm text-white/55">{detail}</p> : null}
        </div>
        <span className="text-lg font-black text-white">{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${tone} shadow-[0_0_30px_rgba(243,111,33,0.35)]`}
        />
      </div>
    </div>
  );
}

export function ProgressRing({ value, label, detail }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeDasharray={circumference}
          />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F36F21" />
              <stop offset="100%" stopColor="#FFBC82" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{value}%</span>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/42">{label}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/66">{detail}</p>
      </div>
    </div>
  );
}

export function CommandPalette({ open, onClose, items, title = 'Actions rapides' }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-md"
        >
          <div className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/8 bg-[#170F0A]/94 shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-[#FFBC82]">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                    Command Palette
                  </p>
                  <h3 className="mt-1 text-lg font-black uppercase text-white">{title}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-white/60 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 p-4">
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#F36F21]/35 hover:bg-white/[0.05]"
                >
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-white/56">{item.description}</p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#FFBC82]">
                    {item.shortcut || 'Action'}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function CommandButton({ onClick }) {
  return (
    <GhostButton onClick={onClick} icon={Command}>
      Ctrl + K
    </GhostButton>
  );
}

function GhostButton({ children, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/82 transition-all hover:-translate-y-0.5 hover:border-[#F36F21]/35 hover:text-white"
    >
      {Icon ? <Icon className="h-4 w-4 text-[#FFBC82]" /> : null}
      <span>{children}</span>
    </button>
  );
}
