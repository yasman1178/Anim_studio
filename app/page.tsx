"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TopBar } from "@/components/TopBar";
import { ProjectSetup } from "@/components/ProjectSetup";
import { ValidationReport } from "@/components/ValidationReport";
import { VocalSeparator } from "@/components/VocalSeparator";
import { VoiceGenerator } from "@/components/VoiceGenerator";
import { StudioTimeline } from "@/components/StudioTimeline";
import { VfxSfxHub } from "@/components/VfxSfxHub";
import { VideoCanvas } from "@/components/VideoCanvas";
import { PublishingHub } from "@/components/PublishingHub";
import StorageManager from "@/components/StorageManager";
import { SAMPLE_PROJECT_SOLO_LEVELING, NotebookLMProject } from "@/lib/sample-data";
import { ValidationResult, validateNotebookLMJson } from "@/lib/validate-json";
import { getStorageStats } from "@/lib/project-storage";
import { Film, CheckCircle2, AlertCircle, Download, ExternalLink, Sparkles, Clapperboard, MonitorPlay, HardDrive } from "lucide-react";

// Pure helper to determine current active VFX and text overlay
function getActiveOverlayAndVfx(shots: NotebookLMProject['shots'], currentTime: number, manualVfx: string | null) {
  let accTime = 0;
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const shotStart = accTime;
    const shotEnd = shotStart + shot.duration_seconds;
    if (currentTime >= shotStart && currentTime < shotEnd) {
      const activeLayer = (shot.vfx_spatial_layers || []).find((vfx) => {
        const vfxStart = shotStart + vfx.trigger_sec;
        const vfxEnd = vfxStart + vfx.duration_sec;
        return currentTime >= vfxStart && currentTime <= vfxEnd;
      });

      return {
        activeTextOverlay: shot.text_overlay || null,
        activeVfxType: activeLayer ? activeLayer.layer_type : manualVfx
      };
    }
    accTime = shotEnd;
  }
  return {
    activeTextOverlay: null,
    activeVfxType: manualVfx
  };
}

export default function AnimeDubStudioPage() {
  const [activeTab, setActiveTab] = useState<string>("project");
  const [project, setProject] = useState<NotebookLMProject>(SAMPLE_PROJECT_SOLO_LEVELING);

  // Derive validation via useMemo without cascading setState
  const validation = useMemo(() => validateNotebookLMJson(project), [project]);

  // Media state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [separatedVocalsUrl, setSeparatedVocalsUrl] = useState<string | null>(null);
  const [separatedInstUrl, setSeparatedInstUrl] = useState<string | null>(null);

  // Playback & VFX state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [manualVfxType, setManualVfxType] = useState<string | null>("blue_aura");

  // Render modal state
  const [isRendering, setIsRendering] = useState(false);
  const [renderFinished, setRenderFinished] = useState(false);

  // Storage manager modal state & stats
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [storageStats, setStorageStats] = useState<{ totalBytes: number; count: number }>({
    totalBytes: 0,
    count: 0,
  });

  // Track and refresh local storage stats in real-time
  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await getStorageStats();
        setStorageStats({ totalBytes: stats.totalBytes, count: stats.count });
      } catch (e) {
        console.error("Failed to get storage stats:", e);
      }
    };

    updateStats();
    if (typeof window !== "undefined") {
      window.addEventListener("animedub:storage_updated", updateStats);
      return () => window.removeEventListener("animedub:storage_updated", updateStats);
    }
  }, []);

  // Synchronized playback timer
  const totalDuration = validation?.calculated_total_duration || 16.0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return Math.round((prev + 0.1) * 10) / 10;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Derive active VFX and Text Overlay dynamically based on current time
  const { activeTextOverlay, activeVfxType } = getActiveOverlayAndVfx(project.shots, currentTime, manualVfxType);

  // Handle render final video simulation
  const handleRenderClick = () => {
    setIsRendering(true);
    setTimeout(() => {
      setIsRendering(false);
      setRenderFinished(true);
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Top Bar with strict 3-zone contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRenderClick={handleRenderClick}
        isRendering={isRendering}
        totalShots={project.shots.length}
        onOpenStorage={() => setIsStorageOpen(true)}
        storageStats={storageStats}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Workspace Panel */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Workspace Sub-Header Tab Switcher for Mobile & Compact screens */}
          <div className="flex lg:hidden items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('project')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 'project' ? "bg-rose-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              المشروع
            </button>
            <button
              onClick={() => setActiveTab('separation')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 'separation' ? "bg-rose-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              فصل الصوت
            </button>
            <button
              onClick={() => setActiveTab('voices')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 'voices' ? "bg-rose-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              الدبلجة
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 'timeline' ? "bg-rose-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              الخط الزمني
            </button>
            <button
              onClick={() => setActiveTab('publishing')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 'publishing' ? "bg-rose-600 text-white font-medium" : "text-slate-400"
              }`}
            >
              النشر
            </button>
          </div>

          {/* Tab 1: Project Setup & Source Media */}
          {activeTab === "project" && (
            <div className="space-y-5">
              <ProjectSetup
                project={project}
                onUpdateProject={setProject}
                validation={validation}
                videoDuration={videoDuration}
                onVideoSelected={(url, dur) => {
                  setVideoUrl(url);
                  setVideoDuration(dur);
                }}
                videoUrl={videoUrl}
                onOpenStorageManager={() => setIsStorageOpen(true)}
              />
              <ValidationReport
                validation={validation}
                videoDuration={videoDuration}
              />
            </div>
          )}

          {/* Tab 2: Free In-Browser Vocal Separation */}
          {activeTab === "separation" && (
            <div className="space-y-5">
              <VocalSeparator
                onStemsReady={(vocals, inst) => {
                  setSeparatedVocalsUrl(vocals);
                  setSeparatedInstUrl(inst);
                }}
                originalAudioUrl={videoUrl}
                onOpenStorageManager={() => setIsStorageOpen(true)}
              />
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-200">
                  إرشادات الجودة وعزل مسارات الأنمي (V19 Separation Guidelines):
                </div>
                <ul className="list-disc list-inside space-y-1 leading-relaxed text-slate-400">
                  <li>الفصل يتم محلياً بالكامل عبر تقنية Mid/Side Spectral Phase Inversion داخل المتصفح.</li>
                  <li>يتم فصل الحوار البشري (Vocals) عن مسار الموسيقى والمؤثرات (Instrumental/BGM) مجاناً وبدون أي تكلفة.</li>
                  <li>بإمكانك كتم صوت الممثلين اليابانيين الأصليين بالكامل مع الإبقاء على الموسيقى التصويرية ليتم تركيب الدبلجة المصرية مكانها بدقة.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 3: Egyptian Voice Generation */}
          {activeTab === "voices" && (
            <VoiceGenerator
              project={project}
              onUpdateProject={setProject}
            />
          )}

          {/* Tab 4: Interactive Studio Timeline & VFX */}
          {activeTab === "timeline" && (
            <div className="space-y-5">
              <StudioTimeline
                project={project}
                currentTime={currentTime}
                onSeek={setCurrentTime}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                totalDuration={totalDuration}
                onTriggerVfx={(type) => setManualVfxType(type)}
              />
              <VfxSfxHub
                onPreviewVfx={(type) => setManualVfxType(type)}
                activeVfxType={activeVfxType}
              />
            </div>
          )}

          {/* Tab 5: Publishing Metadata & YouTube */}
          {activeTab === "publishing" && (
            <PublishingHub
              project={project}
              durationSeconds={totalDuration}
            />
          )}
        </div>

        {/* Right Column: Live Render & Video Canvas Preview */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 sticky top-20">
          <VideoCanvas
            aspectRatio={aspectRatio}
            onToggleAspectRatio={setAspectRatio}
            activeVfxType={activeVfxType}
            textOverlay={activeTextOverlay}
            videoUrl={videoUrl}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setVideoDuration}
          />

          {/* Quick Production Status Panel */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="flex items-center gap-2">
                <MonitorPlay className="w-3.5 h-3.5 text-rose-500" />
                <span>حالة الإنتاج الفوري (Production State)</span>
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">فحص وتكامل الـ JSON:</span>
                <span className={validation?.is_valid ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {validation?.is_valid ? "صالح ومعتمد" : "يتطلب تصحيحاً"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">فصل الصوت الأصلي (مجاناً):</span>
                <span className={separatedInstUrl ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                  {separatedInstUrl ? "جاهز ومعزول (BGM)" : "تجريبي متاح"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">توليد أصوات الدبلجة:</span>
                <span className="text-indigo-400 font-mono font-medium">
                  {project.shots.reduce((acc, s) => acc + s.dialogue.filter(d => d.audio_url).length, 0)} / {project.shots.reduce((acc, s) => acc + s.dialogue.length, 0)} مقطع
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">نسبة العرض المختارة:</span>
                <span className="font-mono text-slate-200">
                  {aspectRatio === '16:9' ? "16:9 (عريض يوتيوب)" : "9:16 (شورتس رأسي)"}
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="pt-2 border-t border-slate-800/80 flex gap-2">
              <button
                onClick={() => setManualVfxType("speed_lines")}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
              >
                اختبار خطوط السرعة
              </button>
              <button
                onClick={() => setManualVfxType("camera_shake")}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
              >
                اختبار اهتزاز الكاميرا
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Render Modal Dialog */}
      {renderFinished && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">اكتمل إنتاج الفيديو بنجاح!</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  تم دمج الدبلجة المصرية والموسيقى المعزولة والمؤثرات البصرية
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>المشروع:</span>
                <span className="font-sans text-white">{project.project_info.anime_title}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>المدة الإجمالية:</span>
                <span className="text-emerald-400">{totalDuration}s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>نسبة العرض:</span>
                <span className="text-slate-200">{aspectRatio}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>قناة النشر:</span>
                <span className="font-sans text-rose-400 font-semibold">{project.project_info.default_channel}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRenderFinished(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  setActiveTab("publishing");
                  setRenderFinished(false);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>الانتقال لبيانات النشر واليوتيوب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IndexedDB Project Storage & Media Manager Dialog */}
      <StorageManager
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        onSelectVideoForProject={(url) => {
          setVideoUrl(url);
          const video = document.createElement("video");
          video.src = url;
          video.onloadedmetadata = () => {
            setVideoDuration(video.duration || 180);
          };
        }}
        onSelectAudioForProject={(url) => {
          setVideoUrl(url);
        }}
      />
    </div>
  );
}
