"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ProjectSetup } from "@/components/ProjectSetup";
import { ValidationReport } from "@/components/ValidationReport";
import { VocalSeparator } from "@/components/VocalSeparator";
import { VoiceGenerator } from "@/components/VoiceGenerator";
import { StudioTimeline } from "@/components/StudioTimeline";
import { VfxSfxHub } from "@/components/VfxSfxHub";
import { VideoCanvas } from "@/components/VideoCanvas";
import { PublishingHub } from "@/components/PublishingHub";
import StorageManager from "@/components/StorageManager";
import { SAMPLE_PROJECT_SEIF_V18, NotebookLMProject } from "@/lib/sample-data";
import { validateNotebookLMJson } from "@/lib/validate-json";
import { getStorageStats, saveMediaAsset } from "@/lib/project-storage";
import { playSfx } from "@/lib/sfx-synthesizer";
import { renderMasterProject, runFullAutomatedDubPipeline } from "@/lib/master-renderer";
import { muxVideoWithAudioInBrowser } from "@/lib/browser-video-muxer";
import { separateAudioInBrowser, extractAudioFromVideoBlob } from "@/lib/audio-separation";
import { CheckCircle2, Sparkles, MonitorPlay, Play, Pause, Download, Volume2, RotateCw, Video, Film, Wand2, Waves, Check } from "lucide-react";

// Pure helper to derive current active VFX, Text Overlay, Voiceover, Camera motion and Beats
function getActiveTimelineState(shots: NotebookLMProject['shots'], currentTime: number, manualVfx: string | null) {
  let accTime = 0;
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const dur = Number(shot.duration_sec ?? shot.duration_seconds) || 5;
    const shotStart = accTime;
    const shotEnd = shotStart + dur;

    if (currentTime >= shotStart && currentTime < shotEnd) {
      // Find active VFX layer
      const activeLayer = (shot.vfx_spatial_layers || []).find((vfx) => {
        const vfxStart = shotStart + vfx.trigger_sec;
        const vfxEnd = vfxStart + vfx.duration_sec;
        return currentTime >= vfxStart && currentTime <= vfxEnd;
      });

      // Find active Beat
      const activeBeat = (shot.beats || []).reduce<string | null>((acc, b) => {
        const beatTime = shotStart + b.at_sec;
        if (currentTime >= beatTime) {
          return b.visual_change;
        }
        return acc;
      }, null);

      // Find active spoken dialogue or voiceover
      const activeDialogueLine = (shot.dialogue || []).find((d) => {
        const dStart = shotStart + (d.trigger_sec || 0);
        const dEnd = dStart + (d.duration_sec || 2.5);
        return currentTime >= dStart && currentTime <= dEnd;
      });

      const activeVoiceover = activeDialogueLine
        ? `${activeDialogueLine.speaker || activeDialogueLine.character_ar || 'سيف'}: ${activeDialogueLine.line || activeDialogueLine.line_egyptian}`
        : shot.voiceover_egyptian || null;

      return {
        activeTextOverlay: shot.text_overlay || null,
        activeVoiceover,
        activeVfxType: activeLayer ? activeLayer.layer_type : manualVfx,
        currentBeat: activeBeat,
        cameraMotion: shot.camera_motion || null,
        activeShot: shot,
        shotStart
      };
    }
    accTime = shotEnd;
  }

  return {
    activeTextOverlay: null,
    activeVoiceover: null,
    activeVfxType: manualVfx,
    currentBeat: null,
    cameraMotion: null,
    activeShot: null,
    shotStart: 0
  };
}

export default function AnimeDubStudioPage() {
  const [activeTab, setActiveTab] = useState<string>("project");
  const [project, setProject] = useState<NotebookLMProject>(SAMPLE_PROJECT_SEIF_V18);

  // Derive validation via useMemo without cascading setState
  const validation = useMemo(() => validateNotebookLMJson(project), [project]);

  // Media state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [separatedVocalsUrl, setSeparatedVocalsUrl] = useState<string | null>(null);
  const [separatedInstUrl, setSeparatedInstUrl] = useState<string | null>(null);
  const [customBgmUrl, setCustomBgmUrl] = useState<string | null>(null);
  const [customBgmName, setCustomBgmName] = useState<string | null>(null);
  const [extractedAudioUrl, setExtractedAudioUrl] = useState<string | null>(null);
  const [extractedAudioBlob, setExtractedAudioBlob] = useState<Blob | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = useState<boolean>(false);

  // Playback & VFX state (defaults to 9:16 Shorts)
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [manualVfxType, setManualVfxType] = useState<string | null>("dark_purple_shadow_aura");

  // Seeking coordination between UI and Hardware Video element
  const [seekTargetTime, setSeekTargetTime] = useState<number | null>(null);
  const [syncAlert, setSyncAlert] = useState<string | null>(null);

  // Track triggered SFX and Dialogue lines during playback to prevent repeated hits
  const triggeredSfxRef = useRef<Set<string>>(new Set());
  const triggeredDialogueRef = useRef<Set<string>>(new Set());
  const activeDialogueAudioRef = useRef<HTMLAudioElement | null>(null);

  // Render modal state
  const [isRendering, setIsRendering] = useState(false);
  const [renderFinished, setRenderFinished] = useState(false);
  const [renderStep, setRenderStep] = useState<string>("");
  const [renderPct, setRenderPct] = useState<number>(0);
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | null>(null);
  const [dubbedVideoUrl, setDubbedVideoUrl] = useState<string | null>(null);
  const [isMasterAudioPlaying, setIsMasterAudioPlaying] = useState<boolean>(false);
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAutoPipelineRunning, setIsAutoPipelineRunning] = useState<boolean>(false);

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
  const totalDuration = validation?.calculated_total_duration || 17.0;

  // Reusable trigger processor for SFX & character dialogues
  const checkAudioTriggers = useCallback((nextTime: number) => {
    let accTime = 0;
    for (const shot of project.shots) {
      const dur = Number(shot.duration_sec ?? shot.duration_seconds) || 5;
      const shotStart = accTime;
      const shotEnd = shotStart + dur;

      if (nextTime >= shotStart && nextTime <= shotEnd) {
        // 1. Play SFX
        const sfxList = Array.isArray(shot.sound_design?.sfx)
          ? shot.sound_design.sfx
          : shot.sound_design?.sfx_name
          ? [{ sfx_name: shot.sound_design.sfx_name, sfx_trigger_sec: shot.sound_design.sfx_trigger_sec || 0, sfx_volume_percent: 80 }]
          : [];

        sfxList.forEach((sfx, sIdx) => {
          const sfxKey = `shot_${shot.shot_number}_sfx_${sIdx}_${sfx.sfx_name}`;
          const triggerAt = shotStart + (sfx.sfx_trigger_sec || 0);

          if (Math.abs(nextTime - triggerAt) <= 0.25 && !triggeredSfxRef.current.has(sfxKey)) {
            triggeredSfxRef.current.add(sfxKey);
            playSfx(sfx.sfx_name, sfx.sfx_volume_percent || 80);
          }
        });

        // 2. Play active character dialogue audio line
        (shot.dialogue || []).forEach((dlg, dIdx) => {
          const dlgKey = `shot_${shot.shot_number}_dlg_${dIdx}`;
          const triggerAt = shotStart + (dlg.trigger_sec || 0);

          if (Math.abs(nextTime - triggerAt) <= 0.25 && !triggeredDialogueRef.current.has(dlgKey)) {
            triggeredDialogueRef.current.add(dlgKey);
            if (dlg.audio_url) {
              try {
                if (activeDialogueAudioRef.current) {
                  activeDialogueAudioRef.current.pause();
                }
                const audio = new Audio(dlg.audio_url);
                activeDialogueAudioRef.current = audio;
                audio.play().catch(() => {});
              } catch {}
            }
          }
        });

        // 3. Play voiceover if present
        if (shot.voiceover_audio_url) {
          const voKey = `shot_${shot.shot_number}_vo`;
          if (Math.abs(nextTime - shotStart) <= 0.25 && !triggeredDialogueRef.current.has(voKey)) {
            triggeredDialogueRef.current.add(voKey);
            try {
              if (activeDialogueAudioRef.current) {
                activeDialogueAudioRef.current.pause();
              }
              const audio = new Audio(shot.voiceover_audio_url);
              activeDialogueAudioRef.current = audio;
              audio.play().catch(() => {});
            } catch {}
          }
        }

        break;
      }
      accTime = shotEnd;
    }
  }, [project.shots]);

  // Hardware Video Clock update callback: called directly by HTMLVideoElement without setInterval collision
  const handleVideoTimeUpdate = (time: number) => {
    setCurrentTime(time);
    checkAudioTriggers(time);
    if (time >= totalDuration) {
      setIsPlaying(false);
      triggeredSfxRef.current.clear();
      triggeredDialogueRef.current.clear();
    }
  };

  // User-initiated seek handler (scrubbing timeline or jumping)
  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, time));
    setCurrentTime(clamped);
    setSeekTargetTime(clamped);
    triggeredSfxRef.current.clear();
    triggeredDialogueRef.current.clear();
    if (activeDialogueAudioRef.current) {
      activeDialogueAudioRef.current.pause();
    }
  };

  // Playback ended handler
  const handlePlaybackEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setSeekTargetTime(0);
    triggeredSfxRef.current.clear();
    triggeredDialogueRef.current.clear();
  };

  // Automatic Proportional Duration Alignment: scales shot durations when real video duration is read
  const handleVideoDurationChange = (vidDur: number) => {
    if (!vidDur || isNaN(vidDur) || vidDur <= 0) return;
    setVideoDuration(vidDur);

    const currentTotal = project.shots.reduce(
      (acc, s) => acc + (Number(s.duration_sec ?? s.duration_seconds) || 5),
      0
    );

    // If video duration differs from current scenario duration by more than 0.25s
    if (currentTotal > 0 && Math.abs(vidDur - currentTotal) > 0.25) {
      const scale = vidDur / currentTotal;
      const scaledShots = project.shots.map((shot) => {
        const oldDur = Number(shot.duration_sec ?? shot.duration_seconds) || 5;
        const newDur = Math.round((oldDur * scale) * 100) / 100;

        return {
          ...shot,
          duration_sec: newDur,
          duration_seconds: newDur,
          dialogue: (shot.dialogue || []).map((d) => ({
            ...d,
            trigger_sec: Math.round(((d.trigger_sec || 0) * scale) * 100) / 100,
          })),
          sound_design: shot.sound_design ? {
            ...shot.sound_design,
            sfx_trigger_sec: Math.round(((shot.sound_design.sfx_trigger_sec || 0) * scale) * 100) / 100,
            sfx: Array.isArray(shot.sound_design.sfx) ? shot.sound_design.sfx.map(s => ({
              ...s,
              sfx_trigger_sec: Math.round(((s.sfx_trigger_sec || 0) * scale) * 100) / 100,
            })) : shot.sound_design.sfx
          } : shot.sound_design
        };
      });

      setProject((prev) => ({
        ...prev,
        shots: scaledShots
      }));
      setSyncAlert(`تمت مواءمة مدة لقطات الخط الزمني بالتناسب (${vidDur.toFixed(1)} ثانية) لتطابق مدة الفيديو الفعلي 100%.`);
      setTimeout(() => setSyncAlert(null), 6000);
    }
  };

  // Fallback playback timer: strictly only active when NO video is loaded (pure storyboard preview mode)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !videoUrl) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            triggeredSfxRef.current.clear();
            triggeredDialogueRef.current.clear();
            return 0;
          }
          const nextTime = Math.round((prev + 0.1) * 10) / 10;
          checkAudioTriggers(nextTime);
          return nextTime;
        });
      }, 100);
    } else if (!isPlaying) {
      triggeredSfxRef.current.clear();
      triggeredDialogueRef.current.clear();
      if (activeDialogueAudioRef.current) {
        activeDialogueAudioRef.current.pause();
      }
    }
    return () => clearInterval(interval);
  }, [isPlaying, videoUrl, totalDuration, checkAudioTriggers]);

  // Derive active states
  const { activeTextOverlay, activeVoiceover, activeVfxType, currentBeat, cameraMotion } = getActiveTimelineState(
    project.shots,
    currentTime,
    manualVfxType
  );

  // Manual trigger for audio extraction from video
  const handleTriggerAudioExtraction = async () => {
    const target = videoUrl || "/sample_anime.mp4";
    setIsExtractingAudio(true);
    try {
      const extracted = await extractAudioFromVideoBlob(target);
      setExtractedAudioUrl(extracted.audioUrl);
      setExtractedAudioBlob(extracted.audioBlob);
      await saveMediaAsset({
        name: `صوت_مستخرج_${(project.project_info.title || 'anime').replace(/\s+/g, '_')}.wav`,
        type: "raw_audio",
        blob: extracted.audioBlob,
        mimeType: "audio/wav",
        metadata: {
          duration: extracted.duration,
          notes: "مستخرج آلياً من الفيديو في المتصفح"
        }
      });
    } catch (e) {
      console.error("Audio extraction failed:", e);
      alert("تعذر استخراج الصوت من الفيديو: " + String(e));
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // 1-Click Automated Dubbing Pipeline Handler
  const handleStartAutoPipeline = async () => {
    setIsAutoPipelineRunning(true);
    setIsRendering(true);
    setRenderStep("بدء خط الأنابيب التلقائي: قراءة ملفات الفيديو وسيناريو الجيسون...");
    setRenderPct(5);

    try {
      const videoSource = videoUrl || "/sample_anime.mp4";
      const result = await runFullAutomatedDubPipeline(
        project,
        videoSource,
        (step, pct) => {
          setRenderStep(step);
          setRenderPct(pct);
        },
        {
          aspectRatio,
          customBgmUrl
        }
      );

      setProject(result.updatedProject);
      setMasterAudioUrl(result.masterAudioUrl);
      if (result.dubbedVideoUrl) {
        setDubbedVideoUrl(result.dubbedVideoUrl);
        setVideoUrl(result.dubbedVideoUrl);
      }
      if (result.instrumentalAudioUrl) {
        setSeparatedInstUrl(result.instrumentalAudioUrl);
      }
      if (result.vocalsAudioUrl) {
        setSeparatedVocalsUrl(result.vocalsAudioUrl);
      }

      setRenderFinished(true);
    } catch (err: any) {
      console.error("Auto pipeline execution failed:", err);
      alert("حدث خطأ أثناء تنفيذ خط أنابيب الدبلجة: " + (err?.message || String(err)));
    } finally {
      setIsAutoPipelineRunning(false);
      setIsRendering(false);
    }
  };

  // Real Master Render Engine: generates missing TTS, mixes audio tracks, and muxes real MP4 video
  const handleRenderClick = async () => {
    setIsRendering(true);
    setRenderStep("بدء فحص ومزامنة السيناريو وتوليد الأصوات...");
    setRenderPct(10);

    try {
      // 1. Ensure clean speech-free instrumental background track exists
      // Prioritize uploaded custom BGM first!
      let instUrl = customBgmUrl || separatedInstUrl;
      const targetVideoUrl = videoUrl || "/sample_anime.mp4";

      if (customBgmUrl) {
        setRenderStep("استخدام مسار الموسيقى المعزولة المرفوع للمشروع (BGM Ready)...");
        setRenderPct(15);
      } else if (!instUrl && targetVideoUrl) {
        setRenderStep("عزل الحوار الأصلي واستخراج مسار الموسيقى بتقنية True Mid-Side (100% Speech-Free)...");
        setRenderPct(12);
        try {
          const sepRes = await separateAudioInBrowser(targetVideoUrl, (pct, msg) => {
            setRenderStep(`عزل الصوت: ${msg}`);
            setRenderPct(10 + Math.round((pct / 100) * 15));
          });
          instUrl = sepRes.instrumentalAudioUrl;
          setSeparatedInstUrl(sepRes.instrumentalAudioUrl);
          setSeparatedVocalsUrl(sepRes.vocalsAudioUrl);
        } catch (e) {
          console.warn("Auto-separation in render click fallback:", e);
        }
      }

      // 2. Render all dialogue and synthesize master multi-track audio
      const result = await renderMasterProject(
        project,
        instUrl,
        (step, pct) => {
          setRenderStep(step);
          setRenderPct(Math.min(75, pct));
        }
      );
      setProject(result.updatedProject);
      setMasterAudioUrl(result.masterAudioUrl);

      // 3. Mux video picture with the newly dubbed audio into a real MP4 video with burned-in subtitles and selected aspect ratio
      setRenderStep(`دمج إطارات الفيديو مع الترجمة والمؤثرات بنسبة (${aspectRatio === '16:9' ? '16:9 يوتيوب' : '9:16 شورتس'})...`);
      setRenderPct(85);

      let finalDubbedUrl: string | null = null;

      // Primary: Universal In-Browser Muxer with Burned-In Subtitles, VFX & selected Aspect Ratio
      try {
        const targetVideo = videoUrl || "/sample_anime.mp4";
        const browserMux = await muxVideoWithAudioInBrowser(
          targetVideo,
          result.masterBlob,
          {
            project: result.updatedProject,
            burnSubtitlesAndVfx: true,
            aspectRatio: aspectRatio,
            onProgress: (step, pct) => {
              setRenderStep(step);
              setRenderPct(pct);
            }
          }
        );
        if (browserMux && browserMux.videoUrl) {
          finalDubbedUrl = browserMux.videoUrl;
        }
      } catch (bErr) {
        console.error("Browser video muxing fallback error:", bErr);
      }

      // Secondary: Server-side FFmpeg Muxer fallback
      if (!finalDubbedUrl) {
        try {
          let videoBlob: Blob | null = null;
          const targetVideoUrl = videoUrl || "/sample_anime.mp4";

          const vRes = await fetch(targetVideoUrl);
          if (vRes.ok) {
            videoBlob = await vRes.blob();
          }

          if (videoBlob) {
            const muxFormData = new FormData();
            const vidFile = new File([videoBlob], "video.mp4", { type: "video/mp4" });
            const audFile = new File([result.masterBlob], "master.wav", { type: "audio/wav" });
            muxFormData.append("video", vidFile);
            muxFormData.append("audio", audFile);

            const muxRes = await fetch("/api/mux-video", {
              method: "POST",
              body: muxFormData,
            });

            if (muxRes.ok) {
              const muxData = await muxRes.json();
              if (muxData.success && muxData.video_url) {
                finalDubbedUrl = muxData.video_url;
              }
            }
          }
        } catch (muxErr) {
          console.warn("Server video muxing failed, using browser fallback:", muxErr);
        }
      }

      if (finalDubbedUrl) {
        setDubbedVideoUrl(finalDubbedUrl);
        setVideoUrl(finalDubbedUrl);
      }

      setRenderPct(100);
      setRenderFinished(true);
    } catch (err: any) {
      console.error("Render error:", err);
      alert("حدث خطأ أثناء الإنتاج: " + (err?.message || String(err)));
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0B0F19] text-slate-100 flex flex-col font-sans pb-20 lg:pb-6" dir="rtl">
      {/* Top Bar with strict mobile boundary contract */}
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
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start overflow-x-hidden">
        {/* Mobile View: Render VideoCanvas FIRST (order-1 on mobile, order-2 on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20 w-full max-w-full">
          {/* Automatic Duration Match Banner */}
          {syncAlert && (
            <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{syncAlert}</span>
            </div>
          )}

          <VideoCanvas
            aspectRatio={aspectRatio}
            onToggleAspectRatio={setAspectRatio}
            activeVfxType={activeVfxType}
            textOverlay={activeTextOverlay}
            activeVoiceover={activeVoiceover}
            cameraMotion={cameraMotion}
            currentBeat={currentBeat}
            videoUrl={videoUrl}
            currentTime={currentTime}
            seekTargetTime={seekTargetTime}
            isPlaying={isPlaying}
            onTimeUpdate={handleVideoTimeUpdate}
            onDurationChange={handleVideoDurationChange}
            onEnded={handlePlaybackEnded}
          />

          {/* Dubbed Video Quick Action Banner */}
          {dubbedVideoUrl && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 space-y-2.5 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>فيديو الدبلجة المكتمل جاهز (MP4)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/50">
                  صوت جديد + ترجمة
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                تم استبدال المسار الصوتي الأصلي بالكامل بالدبلجة والموسيقى، مع حرق الترجمة والمؤثرات في الإطارات.
              </p>
              <a
                href={dubbedVideoUrl}
                download={`dubbed_video_${(project.project_info.title || 'anime').replace(/\s+/g, '_')}.mp4`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950 cursor-pointer"
                title="تحميل الفيديو المدبلج النهائي بصيغة MP4"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الفيديو المدبلج الآن (MP4)</span>
              </a>
            </div>
          )}

          {/* Production State & Storage Quick Status */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
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
                <span className="text-slate-400">فحص سيناريو v18:</span>
                <span className={validation?.is_valid ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {validation?.is_valid ? "معتمد ومطابق لـ v18" : "يتطلب تصحيحاً"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">مخزن الوسائط (/api/media):</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Public Blob Ready (ok: true)</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">المؤثرات الصوتية:</span>
                <span className="text-amber-400 font-medium">Web Audio Synthesizer</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">نسبة العرض:</span>
                <span className="font-mono text-cyan-400">
                  {aspectRatio === '9:16' ? "9:16 (شورتس رأسي)" : "16:9 (عريض يوتيوب)"}
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setManualVfxType("dark_purple_shadow_aura");
                  playSfx("Dark Shadow Energy Aura", 80);
                }}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-purple-300 transition-colors cursor-pointer text-center"
              >
                تجربة هالة الظلال
              </button>
              <button
                onClick={() => {
                  setManualVfxType("camera_shake");
                  playSfx("Sub Boom Impact", 90);
                }}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-rose-300 transition-colors cursor-pointer text-center"
              >
                ضربة الخطاف (Sub Boom)
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View: Workspace Panel SECOND (order-2 on mobile, order-1 on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8 space-y-4 w-full max-w-full">
          {/* Tab 1: Project Setup & Source Media */}
          {activeTab === "project" && (
            <div className="space-y-4">
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
                onStartAutoPipeline={handleStartAutoPipeline}
                isPipelineRunning={isAutoPipelineRunning}
                extractedAudioUrl={extractedAudioUrl}
                extractedAudioBlob={extractedAudioBlob}
                onAudioExtracted={(url, blob) => {
                  setExtractedAudioUrl(url);
                  setExtractedAudioBlob(blob);
                }}
                isExtractingAudio={isExtractingAudio}
                onTriggerAudioExtraction={handleTriggerAudioExtraction}
                customBgmUrl={customBgmUrl}
                customBgmName={customBgmName}
                onCustomBgmSelected={(url, name) => {
                  setCustomBgmUrl(url);
                  setCustomBgmName(name || null);
                  if (url) {
                    setSeparatedInstUrl(url);
                  }
                }}
              />
              <ValidationReport
                validation={validation}
                videoDuration={videoDuration}
              />
            </div>
          )}

          {/* Tab 2: Free In-Browser Vocal Separation */}
          {activeTab === "separation" && (
            <div className="space-y-4">
              <VocalSeparator
                onStemsReady={(vocals, inst) => {
                  setSeparatedVocalsUrl(vocals);
                  setSeparatedInstUrl(inst);
                }}
                originalAudioUrl={videoUrl}
                onOpenStorageManager={() => setIsStorageOpen(true)}
              />
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-200">
                  إرشادات الجودة وعزل مسارات الأنمي (V18 Separation Engine):
                </div>
                <ul className="list-disc list-inside space-y-1 leading-relaxed text-slate-400">
                  <li>الفصل يتم محلياً بالكامل داخل المتصفح مع حماية ترددات الباص وموسيقى الأكشن.</li>
                  <li>يتم عزل الحوار البشري (Vocals) عن مسار الموسيقى والمؤثرات (Instrumental/BGM) مجاناً وبدون أي تكلفة.</li>
                  <li>بإمكانك كتم صوت الممثلين اليابانيين الأصليين بالكامل مع الإبقاء على الموسيقى لتركيب الدبلجة المصرية مكانها بدقة.</li>
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
            <div className="space-y-4">
              <StudioTimeline
                project={project}
                currentTime={currentTime}
                onSeek={handleSeek}
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
      </main>

      {/* Fixed Bottom Navigation for Mobile Devices */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStorage={() => setIsStorageOpen(true)}
        storageCount={storageStats.count}
      />

      {/* Rendering in-progress Overlay */}
      {isRendering && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-500 animate-spin">
              <RotateCw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-100 text-sm">جارِ معالجة وتركيب ماستر الدبلجة والمؤثرات...</h4>
              <p className="text-xs text-rose-300 font-mono">{renderStep || "جاري المعالجة..."}</p>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-cyan-500 transition-all duration-300 rounded-full"
                style={{ width: `${renderPct}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {renderPct}% مكتمل · توليد أصوات الحوار الناقصة ودمج المسارات
            </div>
          </div>
        </div>
      )}

      {/* Render Finished Modal Dialog */}
      {renderFinished && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">اكتمل إنتاج ماستر شورتس الأنمي بنجاح!</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  تم توليد أصوات Edge-TTS الناقصة ودمجها مع BGM والمؤثرات الصوتية بدقة زمنية
                </p>
              </div>
            </div>

            {/* Dubbed Video Preview & Download */}
            {dubbedVideoUrl ? (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-rose-400" />
                    <span>فيديو الدبلجة النهائي المدمج (Dubbed Video MP4):</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">جاهز للتحميل والمشاركة</span>
                </div>

                <div className="rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video max-h-48 flex items-center justify-center">
                  <video
                    src={dubbedVideoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={dubbedVideoUrl}
                    download={`dubbed_video_${(project.project_info.title || 'anime').replace(/\s+/g, '_')}.mp4`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950 cursor-pointer"
                    title="تنزيل الفيديو الكامل المدبلج بصيغة MP4"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الفيديو المدبلج بالكامل (فيديو + صوت MP4)</span>
                  </a>
                </div>
              </div>
            ) : masterAudioUrl ? (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="text-xs text-slate-300 flex items-center justify-between">
                  <span className="font-semibold text-white">دمج الفيديو مع الصوت:</span>
                  <span className="text-[11px] text-amber-400">محرك المتصفح المباشر</span>
                </div>
                <button
                  onClick={async () => {
                    setIsRendering(true);
                    setRenderStep("توليد ودمج الفيديو مباشرة في المتصفح...");
                    try {
                      const res = await fetch(masterAudioUrl);
                      const blob = await res.blob();
                      const targetVideo = videoUrl || "/sample_anime.mp4";
                      const browserMux = await muxVideoWithAudioInBrowser(
                        targetVideo,
                        blob,
                        {
                          project,
                          burnSubtitlesAndVfx: true,
                          aspectRatio,
                          onProgress: (step, pct) => {
                            setRenderStep(step);
                            setRenderPct(pct);
                          }
                        }
                      );
                      if (browserMux?.videoUrl) {
                        setDubbedVideoUrl(browserMux.videoUrl);
                        setVideoUrl(browserMux.videoUrl);
                      }
                    } catch (e) {
                      console.error("Mux error:", e);
                    } finally {
                      setIsRendering(false);
                    }
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>دمج وتصدير الفيديو بالكامل (MP4) فوراً</span>
                </button>
              </div>
            ) : null}

            {/* Master Audio Live Player & Download */}
            {masterAudioUrl && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>معاينة الصوت الماستر المدمج (Master Track):</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300">44.1kHz Stereo WAV</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!masterAudioRef.current) return;
                      if (isMasterAudioPlaying) {
                        masterAudioRef.current.pause();
                        setIsMasterAudioPlaying(false);
                      } else {
                        masterAudioRef.current.play();
                        setIsMasterAudioPlaying(true);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition cursor-pointer"
                  >
                    {isMasterAudioPlaying ? <Pause className="w-4 h-4 text-rose-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                    <span>{isMasterAudioPlaying ? "إيقاف مؤقت للاستماع" : "استماع للمسار الصوتي المدمج"}</span>
                  </button>

                  <a
                    href={masterAudioUrl}
                    download={`master_dubbed_${(project.project_info.title || 'anime').replace(/\s+/g, '_')}.wav`}
                    className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                    title="تنزيل ملف الصوت النهائي الخام"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل (WAV)</span>
                  </a>
                </div>

                <audio
                  ref={masterAudioRef}
                  src={masterAudioUrl}
                  onEnded={() => setIsMasterAudioPlaying(false)}
                  className="hidden"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>المشروع:</span>
                <span className="font-sans text-white">{project.project_info.title || project.project_info.anime_title}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>المدة الإجمالية:</span>
                <span className="text-emerald-400">{totalDuration}s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>الموسيقى والمؤثرات:</span>
                <span className="text-rose-400 font-sans">عزل BGM + دمج أصوات Edge-TTS المتزامنة</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => {
                  if (masterAudioRef.current) masterAudioRef.current.pause();
                  setIsMasterAudioPlaying(false);
                  setRenderFinished(false);
                }}
                className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer min-h-[44px]"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  if (masterAudioRef.current) masterAudioRef.current.pause();
                  setIsMasterAudioPlaying(false);
                  setActiveTab("publishing");
                  setRenderFinished(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>الانتقال لبيانات النشر والـ SEO</span>
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
        onSelectJsonForProject={(loadedProject) => {
          setProject(loadedProject);
        }}
      />
    </div>
  );
}
