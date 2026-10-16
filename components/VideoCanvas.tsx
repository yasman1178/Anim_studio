"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, Smartphone, Monitor, Activity, Zap } from "lucide-react";

interface VideoCanvasProps {
  aspectRatio: '16:9' | '9:16';
  onToggleAspectRatio: (ratio: '16:9' | '9:16') => void;
  activeVfxType?: string | null;
  textOverlay?: string | null;
  activeVoiceover?: string | null;
  cameraMotion?: string | null;
  currentBeat?: string | null;
  videoUrl?: string | null;
  currentTime: number;
  seekTargetTime?: number | null;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (dur: number) => void;
  onEnded?: () => void;
}

export function VideoCanvas({
  aspectRatio,
  onToggleAspectRatio,
  activeVfxType,
  textOverlay,
  activeVoiceover,
  cameraMotion,
  currentBeat,
  videoUrl,
  currentTime,
  seekTargetTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onEnded
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Single-source seeking: only update video.currentTime when an explicit user seek occurs
  useEffect(() => {
    if (seekTargetTime !== undefined && seekTargetTime !== null && videoRef.current) {
      videoRef.current.currentTime = seekTargetTime;
    }
  }, [seekTargetTime]);

  // Sync play/pause with video element smoothly
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Procedural VFX Renderer on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const renderVfx = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      if (activeVfxType === "dark_purple_shadow_aura") {
        // V18 Seif Signature: Dark Purple Shadow Energy Wisps
        const pulse = Math.sin(frame * 0.08) * 0.25 + 0.65;
        const grad = ctx.createRadialGradient(cx, cy * 1.1, 30, cx, cy * 1.1, Math.max(w, h) * 0.7);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, `rgba(109, 40, 217, ${0.35 * pulse})`);
        grad.addColorStop(0.85, `rgba(76, 29, 149, ${0.55 * pulse})`);
        grad.addColorStop(1, `rgba(15, 23, 42, ${0.75 * pulse})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Shadow tendrils
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
        ctx.lineWidth = 2.0;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          let tx = cx + (i - 2) * (w * 0.15);
          let ty = h;
          ctx.moveTo(tx, ty);
          while (ty > h * 0.3) {
            tx += Math.sin(frame * 0.05 + i + ty * 0.02) * 8;
            ty -= 18;
            ctx.lineTo(tx, ty);
          }
          ctx.stroke();
        }
      } else if (activeVfxType === "speed_lines") {
        // Draw anime speed lines radiating outward/inward
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.8;
        const lineCount = 36;
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2 + (frame * 0.05);
          const innerR = Math.min(w, h) * 0.3 + (Math.sin(frame * 0.2 + i) * 20);
          const outerR = Math.max(w, h) * 0.8;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
          ctx.stroke();
        }
      } else if (activeVfxType === "blue_aura") {
        // Glowing pulsing cyan-blue aura
        const pulse = Math.sin(frame * 0.08) * 0.2 + 0.5;
        const gradient = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(w, h) * 0.6);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.6, `rgba(56, 189, 248, ${0.25 * pulse})`);
        gradient.addColorStop(1, `rgba(14, 165, 233, ${0.45 * pulse})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      } else if (activeVfxType === "impact_flash") {
        // Impact white flash with fast decay
        const flashAlpha = Math.max(0, 0.85 - (frame % 30) * 0.05);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
      } else if (activeVfxType === "red_eye_glow") {
        // Red glowing eyes with trails
        const eyeOffset = w * 0.08;
        const eyeY = cy - h * 0.05;
        const glowRadius = 25 + Math.sin(frame * 0.2) * 5;

        [cx - eyeOffset, cx + eyeOffset].forEach((ex) => {
          const grad = ctx.createRadialGradient(ex, eyeY, 2, ex, eyeY, glowRadius);
          grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          grad.addColorStop(0.3, "rgba(239, 68, 68, 0.8)");
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ex, eyeY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeVfxType === "electric_spark" || activeVfxType === "lightning_burst") {
        // Dynamic jagged lightning
        ctx.strokeStyle = "rgba(186, 230, 253, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 15;

        for (let b = 0; b < 2; b++) {
          ctx.beginPath();
          let lx = cx + (b === 0 ? -w * 0.2 : w * 0.2);
          let ly = 0;
          ctx.moveTo(lx, ly);
          while (ly < h) {
            lx += (Math.random() - 0.5) * 35;
            ly += Math.random() * 40 + 20;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      } else if (activeVfxType === "vignette") {
        const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.7);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.75)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      frame++;
      animId = requestAnimationFrame(renderVfx);
    };

    renderVfx();
    return () => cancelAnimationFrame(animId);
  }, [activeVfxType]);

  // Determine dynamic camera motion classes
  let cameraClass = "";
  if (cameraMotion === "shake" || activeVfxType === "camera_shake") {
    cameraClass = "animate-shake";
  } else if (cameraMotion === "zoom_in") {
    cameraClass = "scale-105 transition-transform duration-1000";
  } else if (cameraMotion === "zoom_out") {
    cameraClass = "scale-95 transition-transform duration-1000";
  } else if (cameraMotion === "pan_left") {
    cameraClass = "-translate-x-2 transition-transform duration-1000";
  } else if (cameraMotion === "pan_right") {
    cameraClass = "translate-x-2 transition-transform duration-1000";
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 space-y-3 shadow-xl">
      {/* Video Canvas Header & Aspect Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <span>شاشة العرض والمونتاج (9:16 Shorts)</span>
          {activeVfxType && (
            <span className="text-[11px] font-mono text-rose-400 truncate max-w-[150px]">
              · {activeVfxType}
            </span>
          )}
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onToggleAspectRatio('9:16')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer min-h-[36px] ${
              aspectRatio === '9:16'
                ? "bg-rose-600 text-white font-medium shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 شورتس</span>
          </button>
          <button
            onClick={() => onToggleAspectRatio('16:9')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer min-h-[36px] ${
              aspectRatio === '16:9'
                ? "bg-slate-800 text-white font-medium shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9 يوتيوب</span>
          </button>
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="flex items-center justify-center bg-slate-950/90 rounded-xl p-2 sm:p-3 overflow-hidden min-h-[320px] sm:min-h-[380px]">
        <div
          className={`relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl transition-all duration-300 ${
            aspectRatio === '16:9'
              ? "w-full max-w-[560px] aspect-video"
              : "w-[240px] sm:w-[270px] aspect-[9/16]"
          } ${cameraClass}`}
        >
          {/* Background Video or Dark Fantasy Atmosphere */}
          {(() => {
            if (!videoUrl) {
              return (
                <div className="w-full h-full bg-gradient-to-br from-slate-950 via-[#120B20] to-[#0A1128] flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
                  <div className="w-12 h-12 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2 z-10 shadow-lg shadow-rose-900/30">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-xs font-bold text-slate-100 z-10">
                    حكاية سيف — سلسلة الأنمي
                  </div>
                  <div className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-relaxed z-10">
                    معاينة تلقائية عمودية (9:16) متوافقة مع يوتيوب شورتس وريلز وتيك توك
                  </div>
                </div>
              );
            }

            const ytMatch = videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
            const ytId = ytMatch && ytMatch[2].length === 11 ? ytMatch[2] : null;

            if (ytId) {
              return (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&enablejsapi=1`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }

            return (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                playsInline
                controls={false}
                muted={true}
                onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => onDurationChange?.(e.currentTarget.duration)}
                onEnded={() => onEnded?.()}
              />
            );
          })()}

          {/* Procedural Canvas Layer */}
          <canvas
            ref={canvasRef}
            width={aspectRatio === '16:9' ? 560 : 270}
            height={aspectRatio === '16:9' ? 315 : 480}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* Top Beat / Camera HUD */}
          {(currentBeat || cameraMotion) && (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-cyan-300 z-20 pointer-events-none">
              {currentBeat && (
                <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur border border-cyan-500/30 truncate max-w-[160px] flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>{currentBeat}</span>
                </span>
              )}
              {cameraMotion && (
                <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur border border-slate-700/50 text-slate-400">
                  {cameraMotion}
                </span>
              )}
            </div>
          )}

          {/* Dynamic Voiceover Subtitle & Overlay */}
          <div className="absolute bottom-3 left-2 right-2 text-center z-20 pointer-events-none space-y-1">
            {textOverlay && (
              <div className="inline-block px-2.5 py-1 bg-black/80 backdrop-blur border border-amber-500/40 rounded-lg text-xs font-bold text-amber-300 shadow-xl tracking-wide max-w-full truncate">
                {textOverlay}
              </div>
            )}
            {activeVoiceover && (
              <div className="px-2 py-1 bg-black/85 backdrop-blur-sm rounded border border-white/10 text-[11px] font-medium text-slate-100 leading-snug shadow-2xl">
                {activeVoiceover}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
