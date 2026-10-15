"use client";

import React from "react";
import { FolderGit2, Scissors, Mic2, Clapperboard, Share2, HardDrive } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenStorage: () => void;
  storageCount: number;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  onOpenStorage,
  storageCount,
}: BottomNavProps) {
  const tabs = [
    { id: "project", label: "المشروع", icon: FolderGit2 },
    { id: "separation", label: "عزل الصوت", icon: Scissors },
    { id: "voices", label: "الدبلجة", icon: Mic2 },
    { id: "timeline", label: "الخط الزمني", icon: Clapperboard },
    { id: "publishing", label: "النشر والـ SEO", icon: Share2 },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 lg:hidden safe-area-pb shadow-2xl"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-rose-400 font-semibold scale-105"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Quick Storage Trigger */}
        <button
          onClick={onOpenStorage}
          aria-label="إدارة الوسائط المخزنة"
          className="flex flex-col items-center justify-center min-w-[50px] min-h-[48px] px-2 py-1 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <div className="relative">
            <HardDrive className="w-5 h-5 stroke-[1.75]" />
            {storageCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center">
                {storageCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight leading-none">الذاكرة</span>
        </button>
      </div>
    </nav>
  );
}
