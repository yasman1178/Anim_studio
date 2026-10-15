"use client";

import React, { useState } from "react";
import { VFX_CATALOG, SFX_CATALOG, playSynthesizedSfx, VfxItem } from "@/lib/vfx-catalog";
import { Sparkles, Volume2, Play, CheckCircle2, AlertCircle, Eye, Upload, Layers } from "lucide-react";

interface VfxSfxHubProps {
  onPreviewVfx: (vfxType: string) => void;
  activeVfxType?: string | null;
}

export function VfxSfxHub({ onPreviewVfx, activeVfxType }: VfxSfxHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'combat' | 'energy' | 'drama'>('all');
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);

  const filteredVfx = selectedCategory === 'all'
    ? VFX_CATALOG
    : VFX_CATALOG.filter(v => v.category === selectedCategory);

  const handlePlaySfx = (sfxId: string) => {
    setPlayingSfxId(sfxId);
    playSynthesizedSfx(sfxId);
    setTimeout(() => setPlayingSfxId(null), 600);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <span>مكتبة المؤثرات البصرية والصوتية (VFX & SFX Studio)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            مؤثرات أنمي إجرائية برمجية (Procedural) تعمل فوراً على الشاشة بدون الحاجة لتحميل ملفات خارجية
          </p>
        </div>

        {/* Category filters (Buttons with active states, no candy pills) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedCategory === 'all' ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setSelectedCategory('combat')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedCategory === 'combat' ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            قتال وأكشن
          </button>
          <button
            onClick={() => setSelectedCategory('energy')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedCategory === 'energy' ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            طاقة وخوارق
          </button>
          <button
            onClick={() => setSelectedCategory('drama')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedCategory === 'drama' ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            دراما وتعتيم
          </button>
        </div>
      </div>

      {/* VFX Grid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300">
          كتالوج المؤثرات البصرية للأنمي (انقر لمعاينة التأثير مباشرة على الفيديو)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredVfx.map((vfx) => {
            const isActive = activeVfxType === vfx.id;
            return (
              <div
                key={vfx.id}
                onClick={() => onPreviewVfx(vfx.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                  isActive
                    ? "bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/50"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-100">{vfx.name_ar}</span>
                  <span className="text-[10px] font-mono text-emerald-400">برمجي نشط</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-2">
                  {vfx.description_ar}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                  <span>المدة الافتراضية: {vfx.defaultDurationSec}s</span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <Eye className="w-3 h-3" />
                    <span>تجربة على الفيديو</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SFX Library */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <div className="text-xs font-semibold text-slate-300">
          مؤثرات صوتية اصطناعية (SFX Synthesizer)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {SFX_CATALOG.map((sfx) => (
            <button
              key={sfx.id}
              onClick={() => handlePlaySfx(sfx.id)}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="text-right truncate">
                <div className="font-medium text-slate-200 truncate">{sfx.name_ar}</div>
                <div className="text-[10px] text-slate-500">{sfx.category}</div>
              </div>
              <Volume2 className={`w-3.5 h-3.5 shrink-0 ${playingSfxId === sfx.id ? "text-rose-400 animate-pulse" : "text-slate-400"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
