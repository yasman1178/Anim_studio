"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { NotebookLMProject, Shot, DialogueLine } from "@/lib/sample-data";
import { Play, Pause, RotateCcw, Volume2, Sparkles, Film, Mic, Music, Layers, Volume1 } from "lucide-react";

interface StudioTimelineProps {
  project: NotebookLMProject;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  totalDuration: number;
  onTriggerVfx?: (type: string) => void;
}

// Pure layout calculation helper outside component
function computeShotLayouts(shots: Shot[]) {
  const layouts: Array<{ shot: Shot; start: number; end: number }> = [];
  let time = 0;
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const start = time;
    const end = time + shot.duration_seconds;
    time = end;
    layouts.push({ shot, start, end });
  }
  return layouts;
}

export function StudioTimeline({
  project,
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
  totalDuration,
  onTriggerVfx
}: StudioTimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Formatting time into MM:SS.SS
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // Handle click on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);
  };

  const shotLayouts = computeShotLayouts(project.shots);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
      {/* Transport Controls & Timecode */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-sm shadow-rose-950/40 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={() => onSeek(0)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="الرجوع للبداية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-base tabular-nums font-bold text-slate-100 px-3 py-1 bg-slate-950 rounded-md border border-slate-800">
            {formatTimecode(currentTime)} <span className="text-slate-500 text-xs">/ {formatTimecode(totalDuration)}</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span>{project.shots.length} لقطات متزامنة</span>
          <span className="mx-2">·</span>
          <span>دبلجة مصرية احترافية</span>
        </div>
      </div>

      {/* Multi-Track Canvas View */}
      <div className="space-y-2 select-none">
        {/* Time ruler */}
        <div className="relative h-6 bg-slate-950/80 rounded border border-slate-800/80 text-[10px] font-mono tabular-nums text-slate-500 overflow-hidden">
          {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
            const leftPct = (sec / totalDuration) * 100;
            return (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-slate-800 flex flex-col justify-between pl-1"
                style={{ left: `${leftPct}%` }}
              >
                <span>{sec}s</span>
              </div>
            );
          })}
        </div>

        {/* Tracks Container */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer space-y-1.5 p-2"
        >
          {/* Animated Playhead Red Bar */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none transition-all duration-75"
            style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
          >
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full -ml-1 -mt-0.5 shadow-md shadow-rose-500/50" />
          </div>

          {/* Track 1: Video Shots Track */}
          <div className="relative h-11 bg-slate-900 rounded border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1 z-10 pointer-events-none">
              <Film className="w-3 h-3 text-sky-400" />
              <span>فيديو المشاهد (Shots)</span>
            </div>
            {shotLayouts.map(({ shot, start, end }) => {
              const widthPct = ((end - start) / totalDuration) * 100;
              const leftPct = (start / totalDuration) * 100;
              const isCurrent = currentTime >= start && currentTime < end;

              return (
                <div
                  key={shot.shot_number}
                  className={`absolute top-0 bottom-0 border-r border-slate-700/80 p-1.5 transition-colors flex flex-col justify-between ${
                    isCurrent ? "bg-sky-950/40 border-sky-600" : "bg-slate-800/40"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <div className="text-[10px] font-bold text-sky-300 font-mono truncate">
                    #{shot.shot_number} {shot.text_overlay || shot.timeframe}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono tabular-nums">
                    {shot.duration_seconds}s
                  </div>
                </div>
              );
            })}
          </div>

          {/* Track 2: Egyptian Dialogue Track */}
          <div className="relative h-11 bg-slate-900 rounded border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1 z-10 pointer-events-none">
              <Mic className="w-3 h-3 text-rose-400" />
              <span>الحوار المصري (Dialogue)</span>
            </div>
            {shotLayouts.flatMap(({ shot, start }) =>
              shot.dialogue.map((line) => {
                const lineStart = start + line.trigger_sec;
                const lineEnd = lineStart + line.duration_sec;
                const widthPct = ((lineEnd - lineStart) / totalDuration) * 100;
                const leftPct = (lineStart / totalDuration) * 100;
                const isLineActive = currentTime >= lineStart && currentTime <= lineEnd;

                return (
                  <div
                    key={line.id}
                    className={`absolute top-1 bottom-1 rounded px-1.5 py-0.5 text-[10px] font-medium border flex items-center justify-between overflow-hidden ${
                      isLineActive
                        ? "bg-rose-900/80 border-rose-400 text-rose-100 shadow-sm"
                        : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                    }`}
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 4)}%` }}
                    title={`${line.character_ar}: ${line.line_egyptian}`}
                  >
                    <span className="truncate">{line.character_ar}: {line.line_egyptian}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Track 3: Narrator Voiceover Track */}
          <div className="relative h-9 bg-slate-900 rounded border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1 z-10 pointer-events-none">
              <Volume1 className="w-3 h-3 text-indigo-400" />
              <span>الراوي (VO)</span>
            </div>
            {shotLayouts.map(({ shot, start, end }) => {
              if (!shot.voiceover_egyptian) return null;
              const widthPct = ((end - start) / totalDuration) * 100;
              const leftPct = (start / totalDuration) * 100;
              const isActive = currentTime >= start && currentTime < end;

              return (
                <div
                  key={`vo_${shot.shot_number}`}
                  className={`absolute top-1 bottom-1 rounded px-1.5 py-0.5 text-[10px] border truncate ${
                    isActive
                      ? "bg-indigo-900/70 border-indigo-400 text-indigo-100"
                      : "bg-indigo-950/40 border-indigo-800/60 text-indigo-300"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  تعليق: {shot.voiceover_egyptian}
                </div>
              );
            })}
          </div>

          {/* Track 4: Instrumental BGM Track */}
          <div className="relative h-8 bg-slate-900 rounded border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1 z-10 pointer-events-none">
              <Music className="w-3 h-3 text-emerald-400" />
              <span>الموسيقى المعزولة (BGM)</span>
            </div>
            <div className="w-full h-3 bg-emerald-950/40 border-y border-emerald-800/40 mx-2 rounded flex items-center px-2">
              <div className="text-[9px] text-emerald-400 font-mono">
                موسيقى تصويرية معزولة (Auto-Ducking مفعل أثناء الحوار)
              </div>
            </div>
          </div>

          {/* Track 5: VFX & Visual Layers */}
          <div className="relative h-9 bg-slate-900 rounded border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1 z-10 pointer-events-none">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>مؤثرات بصرية (VFX)</span>
            </div>
            {shotLayouts.flatMap(({ shot, start }) =>
              (shot.vfx_spatial_layers || []).map((vfx, vIdx) => {
                const vfxStart = start + vfx.trigger_sec;
                const vfxEnd = vfxStart + vfx.duration_sec;
                const widthPct = ((vfxEnd - vfxStart) / totalDuration) * 100;
                const leftPct = (vfxStart / totalDuration) * 100;
                const isActive = currentTime >= vfxStart && currentTime <= vfxEnd;

                return (
                  <div
                    key={`vfx_${shot.shot_number}_${vIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerVfx?.(vfx.layer_type);
                    }}
                    className={`absolute top-1 bottom-1 rounded px-1.5 py-0.5 text-[9px] font-mono border flex items-center truncate cursor-pointer ${
                      isActive
                        ? "bg-amber-900/80 border-amber-400 text-amber-100 shadow-sm"
                        : "bg-amber-950/40 border-amber-800/60 text-amber-300"
                    }`}
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 4)}%` }}
                    title={`انقر لمعاينة ${vfx.layer_type}`}
                  >
                    ★ {vfx.layer_type}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
