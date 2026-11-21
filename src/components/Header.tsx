import React from 'react';

interface HeaderProps {
  savedCount: number;
  onStartScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({ savedCount, onStartScan }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-6 lg:px-10">
        {/* Zone 1: Brand Wordmark (single element) */}
        <a
          href="#top"
          className="font-editorial text-2xl font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          Mise
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
        >
          <a
            href="#capture"
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Capture
          </a>
          <a
            href="#meals"
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Meal List
          </a>
          <a
            href="#saved"
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 tabular-nums"
          >
            Saved ({savedCount})
          </a>
          <a
            href="#method"
            className="hover:text-zinc-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Method
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartScan}
            className="min-h-[40px] rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Capture Photo
          </button>
        </div>
      </div>
    </header>
  );
};
