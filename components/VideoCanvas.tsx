"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, Maximize2, Smartphone, Monitor } from "lucide-react";

interface VideoCanvasProps {
  aspectRatio: '16:9' | '9:16';
  onToggleAspectRatio: (ratio: '16:9' | '9:16') => void;
  activeVfxType?: string | null;
  textOverlay?: string | null;
  videoUrl?: string | null;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (dur: number) => void;
}

export function VideoCanvas({
  aspectRatio,
  onToggleAspectRatio,
  activeVfxType,
  textOverlay,
  videoUrl,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onDurationChange
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync external currentTime with video element
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.4) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync play/pause with video element
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

      if (activeVfxType === "speed_lines") {
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
        // Glowing pulsing blue aura
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
      } else if (activeVfxType === "slash_arc") {
        // Curved sword slash
        ctx.strokeStyle = "rgba(254, 240, 138, 0.9)";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.45, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (activeVfxType === "vignette") {
        // Soft cinematic vignette
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

  const isCameraShake = activeVfxType === "camera_shake";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
      {/* Video Canvas Header & Aspect Switcher */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <span>معاينة الرندر المباشر (Remotion Preview Canvas)</span>
          {activeVfxType && (
            <span className="text-[11px] font-mono text-rose-400">
              · مؤثر نشط: {activeVfxType}
            </span>
          )}
        </div>

        {/* Aspect Ratio Switcher (Segmented Control) */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onToggleAspectRatio('16:9')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
              aspectRatio === '16:9'
                ? "bg-slate-800 text-white font-medium shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9 (يوتيوب)</span>
          </button>
          <button
            onClick={() => onToggleAspectRatio('9:16')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
              aspectRatio === '9:16'
                ? "bg-rose-600 text-white font-medium shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 (شورتس/تأطير ذكي)</span>
          </button>
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="flex items-center justify-center bg-black/90 rounded-lg p-2 overflow-hidden min-h-[300px]">
        <div
          className={`relative bg-slate-950 rounded border border-slate-800 overflow-hidden shadow-2xl transition-all duration-300 ${
            aspectRatio === '16:9'
              ? "w-full max-w-[560px] aspect-video"
              : "w-[240px] aspect-[9/16]"
          } ${isCameraShake ? "animate-shake" : ""}`}
        >
          {/* Background Video or Anime Aesthetic Backdrop */}
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              playsInline
              onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => onDurationChange?.(e.currentTarget.duration)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-slate-200">
                شاشة عرض الأنمي والدبلجة
              </div>
              <div className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                يتم عرض الفيديو الأصلي أو المحاكاة البصرية مع دمج المؤثرات الإجرائية والدبلجة
              </div>
            </div>
          )}

          {/* Procedural Canvas Layer */}
          <canvas
            ref={canvasRef}
            width={aspectRatio === '16:9' ? 560 : 240}
            height={aspectRatio === '16:9' ? 315 : 426}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* Text Overlay (Title of the shot from JSON) */}
          {textOverlay && (
            <div className="absolute bottom-4 left-3 right-3 text-center z-20 pointer-events-none">
              <span className="inline-block px-3 py-1 bg-black/75 backdrop-blur border border-white/10 rounded text-xs font-bold text-amber-300 shadow-lg tracking-wide">
                {textOverlay}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
