"use client";

import React from "react";
import { Film, Download, CheckCircle2, Clapperboard, HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/project-storage";

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRenderClick: () => void;
  isRendering: boolean;
  totalShots: number;
  onOpenStorage?: () => void;
  storageStats?: { totalBytes: number; count: number };
}

export function TopBar({
  activeTab,
  setActiveTab,
  onRenderClick,
  isRendering,
  totalShots,
  onOpenStorage,
  storageStats
}: TopBarProps) {
  const navItems = [
    { id: "project", label: "المشروع والوسائط" },
    { id: "separation", label: "فصل الصوت (مجاني)" },
    { id: "voices", label: "الدبلجة المصرية" },
    { id: "timeline", label: "الخط الزمني والمؤثرات" },
    { id: "publishing", label: "النشر واليوتيوب" }
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/50">
          <Clapperboard className="w-4 h-4" />
        </div>
        <div className="text-base font-bold tracking-tight text-white whitespace-nowrap">
          محب أنمي <span className="text-rose-500 font-semibold text-xs ml-1">Studio V19</span>
        </div>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
                isActive
                  ? "text-rose-400 border-b-2 border-rose-500 font-semibold"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Project Storage Manager Button */}
        {onOpenStorage && (
          <button
            type="button"
            onClick={onOpenStorage}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            title="عرض وإدارة ذاكرة الموقع المحلية للمتصفح وحذف الملفات"
          >
            <HardDrive className="w-3.5 h-3.5 text-rose-400" />
            <span>ذاكرة الموقع: {storageStats && storageStats.count > 0 ? formatBytes(storageStats.totalBytes) : '0 م.ب'}</span>
            {storageStats && storageStats.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 font-mono">
                {storageStats.count}
              </span>
            )}
          </button>
        )}

        <a
          href="/Anim_dut_project.zip"
          download="Anim_dut_project.zip"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title="تحميل كود المشروع بالكامل كملف ZIP"
        >
          <Download className="w-3.5 h-3.5 text-rose-400" />
          <span>تحميل المشروع (ZIP)</span>
        </a>

        <button
          onClick={onRenderClick}
          disabled={isRendering || totalShots === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-sm shadow-rose-950/40 cursor-pointer"
        >
          {isRendering ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>جارِ الرندر والمعالجة...</span>
            </>
          ) : (
            <>
              <Film className="w-3.5 h-3.5" />
              <span>معاينة ورندر الفيديو</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
