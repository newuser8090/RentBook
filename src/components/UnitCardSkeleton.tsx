import React from 'react';
import { AppTheme } from '../App';

interface UnitCardSkeletonProps {
  theme?: AppTheme;
  id?: string;
}

export const UnitCardSkeleton: React.FC<UnitCardSkeletonProps> = ({
  theme = 'dark',
  id,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      id={id || 'unit-card-skeleton'}
      className={`rounded-2xl p-3.5 sm:p-4 transition-all shadow-xs space-y-2.5 border-l-4 border-l-emerald-500/50 animate-pulse ${
        isDark
          ? 'bg-zinc-900/70 border border-zinc-800/70 text-zinc-100'
          : 'bg-white/90 border border-slate-200/80 text-slate-900 shadow-slate-200/40'
      }`}
    >
      {/* 1. Top Bar Row */}
      <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Unit Name Badge Placeholder */}
          <div
            className={`w-14 h-5 rounded-md border shrink-0 ${
              isDark
                ? 'bg-zinc-800/90 border-zinc-700/70'
                : 'bg-slate-200 border-slate-300'
            }`}
          />

          {/* Tenant Name Placeholder */}
          <div
            className={`w-28 sm:w-36 h-4 rounded-md shrink-0 ${
              isDark ? 'bg-zinc-800/60' : 'bg-slate-200'
            }`}
          />
        </div>

        {/* Status Pill Placeholder */}
        <div
          className={`w-16 h-5 rounded-full border shrink-0 ${
            isDark
              ? 'bg-zinc-800/70 border-zinc-700/60'
              : 'bg-slate-200 border-slate-300'
          }`}
        />
      </div>

      {/* 2. Middle Metadata Strip */}
      <div
        className={`pt-2 pb-0.5 border-t grid grid-cols-3 gap-2 items-center text-xs min-w-0 overflow-hidden ${
          isDark ? 'border-zinc-800/70' : 'border-slate-100'
        }`}
      >
        {/* Rent Col */}
        <div className="min-w-0">
          <div
            className={`h-2.5 w-8 rounded mb-1.5 ${
              isDark ? 'bg-zinc-800/50' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-3.5 w-16 rounded ${
              isDark ? 'bg-zinc-800/70' : 'bg-slate-300'
            }`}
          />
        </div>

        {/* Meter Col */}
        <div className="min-w-0">
          <div
            className={`h-2.5 w-10 rounded mb-1.5 ${
              isDark ? 'bg-zinc-800/50' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-3.5 w-14 rounded ${
              isDark ? 'bg-zinc-800/70' : 'bg-slate-300'
            }`}
          />
        </div>

        {/* Cycle Col */}
        <div className="min-w-0 text-right">
          <div
            className={`h-2.5 w-8 rounded mb-1.5 ml-auto ${
              isDark ? 'bg-zinc-800/50' : 'bg-slate-200'
            }`}
          />
          <div
            className={`h-3.5 w-14 rounded ml-auto ${
              isDark ? 'bg-zinc-800/70' : 'bg-slate-300'
            }`}
          />
        </div>
      </div>

      {/* 3. Action Button Row */}
      <div className="pt-0.5 flex items-center justify-between gap-2 min-w-0">
        {/* Primary Action Button Placeholder */}
        <div
          className={`flex-1 h-9 rounded-lg ${
            isDark ? 'bg-zinc-800/80' : 'bg-slate-200'
          }`}
        />

        {/* Manage Button Placeholder */}
        <div
          className={`w-9 h-9 rounded-lg border shrink-0 ${
            isDark
              ? 'bg-zinc-800/60 border-zinc-800'
              : 'bg-slate-100 border-slate-200'
          }`}
        />

        {/* Quick WhatsApp Button Placeholder */}
        <div
          className={`w-9 h-9 rounded-lg border shrink-0 ${
            isDark
              ? 'bg-zinc-800/60 border-zinc-800'
              : 'bg-slate-100 border-slate-200'
          }`}
        />
      </div>
    </div>
  );
};
