"use client";

import React, { useRef } from "react";
import { NotebookLMProject, Shot } from "@/lib/sample-data";
import { Play, Pause, RotateCcw, Sparkles, Film, Mic, Volume1, Volume2, Activity } from "lucide-react";
import { playSfx } from "@/lib/sfx-synthesizer";

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
    const dur = Number(shot.duration_sec ?? shot.duration_seconds) || 5;
    const start = time;
    const end = time + dur;
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

  // Handle click / touch on timeline to seek
  const handleTimelineSeek = (clientX: number) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);
  };

  const shotLayouts = computeShotLayouts(project.shots);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Transport Controls & Timecode */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
            className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-md shadow-rose-950/50 cursor-pointer active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={() => onSeek(0)}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            title="الرجوع للبداية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-sm sm:text-base tabular-nums font-bold text-slate-100 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
            {formatTimecode(currentTime)} <span className="text-slate-500 text-xs">/ {formatTimecode(totalDuration)}</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono hidden sm:flex items-center gap-2">
          <span>{project.shots.length} لقطات متزامنة</span>
          <span>·</span>
          <span>إيقاع Beats كل 2.5ث</span>
        </div>
      </div>

      {/* Multi-Track Canvas View */}
      <div className="space-y-2 select-none overflow-x-auto pb-1">
        {/* Time ruler */}
        <div className="relative h-6 bg-slate-950/80 rounded-lg border border-slate-800/80 text-[10px] font-mono tabular-nums text-slate-500 overflow-hidden min-w-[500px]">
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
          onClick={(e) => handleTimelineSeek(e.clientX)}
          onTouchStart={(e) => handleTimelineSeek(e.touches[0].clientX)}
          className="relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer space-y-1.5 p-2 min-w-[500px]"
        >
          {/* Animated Playhead Red Bar */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none transition-all duration-75"
            style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
          >
            <div className="w-3 h-3 bg-rose-500 rounded-full -ml-1.5 -mt-1 shadow-lg shadow-rose-500/80" />
          </div>

          {/* Track 1: Video Shots Track */}
          <div className="relative h-11 bg-slate-900 rounded-lg border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-slate-500 flex items-center gap-1 z-10 pointer-events-none">
              <Film className="w-3 h-3 text-sky-400" />
              <span>فيديو المشاهد ({project.project_info.aspect_ratio || '9:16'})</span>
            </div>
            {shotLayouts.map(({ shot, start, end }) => {
              const widthPct = ((end - start) / totalDuration) * 100;
              const leftPct = (start / totalDuration) * 100;
              const isCurrent = currentTime >= start && currentTime < end;

              return (
                <div
                  key={shot.shot_number}
                  className={`absolute top-0 bottom-0 border-r border-slate-700/80 p-1.5 transition-colors flex flex-col justify-between ${
                    isCurrent ? "bg-sky-950/50 border-sky-500" : "bg-slate-800/40"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <div className="text-[10px] font-bold text-sky-300 font-mono truncate">
                    #{shot.shot_number} {shot.type ? `[${shot.type}]` : ''} {shot.text_overlay || shot.timeframe}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono tabular-nums">
                    {shot.duration_sec ?? shot.duration_seconds}s · {shot.camera_motion || 'static'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Track 2: Visual Beats Track (v18 Feature) */}
          <div className="relative h-8 bg-slate-900 rounded-lg border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-cyan-400 flex items-center gap-1 z-10 pointer-events-none">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>إيقاع اللقطات (Beats)</span>
            </div>
            {shotLayouts.flatMap(({ shot, start }) =>
              (shot.beats || []).map((beat, bIdx) => {
                const beatTime = start + beat.at_sec;
                const leftPct = (beatTime / totalDuration) * 100;
                const isCurrent = Math.abs(currentTime - beatTime) < 0.35;

                return (
                  <div
                    key={`beat_${shot.shot_number}_${bIdx}`}
                    className={`absolute top-1 bottom-1 px-1.5 py-0.5 rounded text-[9px] font-mono border flex items-center truncate ${
                      isCurrent
                        ? "bg-cyan-900/90 border-cyan-400 text-cyan-100 shadow-sm"
                        : "bg-cyan-950/40 border-cyan-800/60 text-cyan-300"
                    }`}
                    style={{ left: `${leftPct}%`, maxWidth: "25%" }}
                    title={beat.visual_change}
                  >
                    ● {beat.visual_change}
                  </div>
                );
              })
            )}
          </div>

          {/* Track 3: Egyptian Dialogue & Voiceover */}
          <div className="relative h-11 bg-slate-900 rounded-lg border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-rose-400 flex items-center gap-1 z-10 pointer-events-none">
              <Mic className="w-3 h-3 text-rose-400" />
              <span>الدبلجة المصرية (VO / Dialogue)</span>
            </div>
            {shotLayouts.map(({ shot, start, end }) => {
              const vo = shot.voiceover_egyptian;
              if (!vo) return null;
              const widthPct = ((end - start) / totalDuration) * 100;
              const leftPct = (start / totalDuration) * 100;
              const isActive = currentTime >= start && currentTime < end;

              return (
                <div
                  key={`vo_${shot.shot_number}`}
                  className={`absolute top-1 bottom-1 rounded px-2 py-0.5 text-[10px] border flex items-center justify-between overflow-hidden ${
                    isActive
                      ? "bg-rose-900/80 border-rose-400 text-rose-100 shadow-sm"
                      : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <span className="truncate">{shot.vocal_cue ? `[${shot.vocal_cue}] ` : ''}{vo}</span>
                </div>
              );
            })}
          </div>

          {/* Track 4: Instant SFX Track (Web Audio API) */}
          <div className="relative h-9 bg-slate-900 rounded-lg border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-amber-400 flex items-center gap-1 z-10 pointer-events-none">
              <Volume2 className="w-3 h-3 text-amber-400" />
              <span>المؤثرات الصوتية (SFX Web Audio)</span>
            </div>
            {shotLayouts.flatMap(({ shot, start }) => {
              const sfxItems = Array.isArray(shot.sound_design?.sfx)
                ? shot.sound_design.sfx
                : shot.sound_design?.sfx_name
                ? [{ sfx_name: shot.sound_design.sfx_name, sfx_trigger_sec: shot.sound_design.sfx_trigger_sec || 0, sfx_volume_percent: 80 }]
                : [];

              return sfxItems.map((sfx, sIdx) => {
                const sfxTime = start + (sfx.sfx_trigger_sec || 0);
                const leftPct = (sfxTime / totalDuration) * 100;
                const isCurrent = Math.abs(currentTime - sfxTime) < 0.4;

                return (
                  <div
                    key={`sfx_${shot.shot_number}_${sIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playSfx(sfx.sfx_name, sfx.sfx_volume_percent || 80);
                    }}
                    className={`absolute top-1 bottom-1 rounded px-2 py-0.5 text-[9px] font-mono border flex items-center gap-1 cursor-pointer transition-transform active:scale-95 ${
                      isCurrent
                        ? "bg-amber-900/90 border-amber-400 text-amber-100 shadow-md animate-pulse"
                        : "bg-amber-950/40 border-amber-800/60 text-amber-300 hover:border-amber-600"
                    }`}
                    style={{ left: `${leftPct}%`, maxWidth: "25%" }}
                    title={`انقر لتشغيل المؤثر: ${sfx.sfx_name}`}
                  >
                    <Volume2 className="w-2.5 h-2.5" />
                    <span className="truncate">{sfx.sfx_name}</span>
                  </div>
                );
              });
            })}
          </div>

          {/* Track 5: VFX & Visual Layers */}
          <div className="relative h-9 bg-slate-900 rounded-lg border border-slate-800 flex items-center overflow-hidden">
            <div className="absolute right-2 text-[10px] font-semibold text-purple-400 flex items-center gap-1 z-10 pointer-events-none">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>هالات وطاقة (VFX)</span>
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
                        ? "bg-purple-900/80 border-purple-400 text-purple-100 shadow-sm"
                        : "bg-purple-950/40 border-purple-800/60 text-purple-300"
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
