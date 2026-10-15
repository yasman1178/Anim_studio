"use client";

import React, { useState, useEffect, useRef } from "react";
import { separateAudioInBrowser, SeparationResult } from "@/lib/audio-separation";
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle, Sliders, Waves, Sparkles, AlertCircle, Upload, Film, FileAudio } from "lucide-react";

interface VocalSeparatorProps {
  onStemsReady: (vocalsUrl: string, instrumentalUrl: string) => void;
  originalAudioUrl?: string | null;
}

export function VocalSeparator({
  onStemsReady,
  originalAudioUrl
}: VocalSeparatorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [separationResult, setSeparationResult] = useState<SeparationResult | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Playback & Mixer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [abMode, setAbMode] = useState<'original' | 'instrumental' | 'vocals'>('instrumental');
  const [dialogueVolume, setDialogueVolume] = useState(0.2); // lowered original dialogue
  const [musicVolume, setMusicVolume] = useState(1.0);
  const [isDialogueMuted, setIsDialogueMuted] = useState(true); // default mute original dialogue as per dubbing spec

  // Audio elements
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const vocalsAudioRef = useRef<HTMLAudioElement | null>(null);
  const instAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle local video/audio file selection for separation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    await runSeparationWithBlob(file);
  };

  // Volume synchronization effects
  useEffect(() => {
    if (instAudioRef.current) {
      instAudioRef.current.volume = Math.max(0, Math.min(1, musicVolume));
    }
  }, [musicVolume]);

  useEffect(() => {
    if (vocalsAudioRef.current) {
      vocalsAudioRef.current.volume = isDialogueMuted ? 0 : Math.max(0, Math.min(1, dialogueVolume));
    }
  }, [dialogueVolume, isDialogueMuted]);

  // Separate directly from the project's uploaded video
  const separateUploadedVideo = async () => {
    if (!originalAudioUrl) return;

    if (originalAudioUrl.includes("youtube.com") || originalAudioUrl.includes("youtu.be")) {
      alert("روابط يوتيوب لا تتيح للمتصفح تنزيل الصوت الخام مباشرة بسبب قيود حماية Google. لفصل الصوت الحقيقي بدقة 100%، يرجى رفع ملف الفيديو (MP4/WebM) من جهازك مباشرة عبر زر رفع الملف.");
      return;
    }

    setSelectedFileName("فيديو المشروع المرفوع");
    setIsProcessing(true);
    setProgress(10);
    setProgressStep("استخراج المسار الصوتي الحقيقي من ملف الفيديو...");

    try {
      const response = await fetch(originalAudioUrl);
      const blob = await response.blob();
      await runSeparationWithBlob(blob);
    } catch (err) {
      console.error("Error reading video audio:", err);
      alert("تعذر قراءة صوت الفيديو: " + String(err));
      setIsProcessing(false);
    }
  };

  // Instant demo separation without requiring external files
  const runDemoSeparation = async () => {
    setSelectedFileName("عينة أنمي نموذجية (موسيقى أوركسترا وحوار)");
    setIsProcessing(true);
    setProgress(20);
    setProgressStep("تجهيز قنوات الصوت للعينة التجريبية...");

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 44100 });
      const duration = 5.0;
      const sampleRate = 44100;
      const length = Math.floor(duration * sampleRate);
      const buffer = ctx.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const bass = Math.sin(2 * Math.PI * 65.41 * t) * 0.25;
        const padL = Math.sin(2 * Math.PI * 261.63 * t) * 0.15 + Math.sin(2 * Math.PI * 392.0 * t) * 0.12;
        const padR = Math.sin(2 * Math.PI * 329.63 * t) * 0.15 + Math.sin(2 * Math.PI * 523.25 * t) * 0.12;

        let dialogue = 0;
        if (t > 1.0 && t < 4.2) {
          const speechPulse = Math.sin(2 * Math.PI * 180 * t);
          const formant1 = Math.sin(2 * Math.PI * 750 * t) * 0.5;
          const formant2 = Math.sin(2 * Math.PI * 1400 * t) * 0.3;
          const formant3 = Math.sin(2 * Math.PI * 2400 * t) * 0.2;
          const env = Math.sin(((t - 1.0) / 3.2) * Math.PI);
          dialogue = (speechPulse + formant1 + formant2 + formant3) * 0.35 * env;
        }

        left[i] = padL + bass + dialogue;
        right[i] = padR + bass + dialogue;
      }

      const result = await separateAudioInBrowser(buffer, (pct, step) => {
        setProgress(pct);
        setProgressStep(step);
      });

      setSeparationResult(result);
      setIsVerified(false);
      onStemsReady(result.vocalsAudioUrl, result.instrumentalAudioUrl);
    } catch (err) {
      console.error("Demo separation error:", err);
      alert("حدث خطأ أثناء تشغيل العينة: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const runSeparationWithBlob = async (blob: Blob) => {
    setIsProcessing(true);
    setProgress(15);
    setProgressStep("تحليل القنوات الصوتية وتفكيك الإشارة...");

    try {
      const result = await separateAudioInBrowser(blob, (pct, step) => {
        setProgress(pct);
        setProgressStep(step);
      });

      setSeparationResult(result);
      setIsVerified(false);
      onStemsReady(result.vocalsAudioUrl, result.instrumentalAudioUrl);
    } catch (err) {
      console.error("Separation error:", err);
      alert("حدث خطأ أثناء فصل ملف الصوت: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      originalAudioRef.current?.pause();
      vocalsAudioRef.current?.pause();
      instAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const activeEl = abMode === 'original' 
        ? originalAudioRef.current 
        : abMode === 'vocals'
        ? vocalsAudioRef.current
        : instAudioRef.current;

      if (activeEl) {
        activeEl.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleAbSwitch = (mode: 'original' | 'instrumental' | 'vocals') => {
    setAbMode(mode);
    const wasPlaying = isPlaying;
    originalAudioRef.current?.pause();
    vocalsAudioRef.current?.pause();
    instAudioRef.current?.pause();

    setTimeout(() => {
      if (wasPlaying) {
        if (mode === 'original') originalAudioRef.current?.play();
        if (mode === 'instrumental') instAudioRef.current?.play();
        if (mode === 'vocals') vocalsAudioRef.current?.play();
      }
    }, 50);
  };

  // Waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.lineWidth = 2;
      const numBars = 48;
      const barWidth = (width / numBars) - 2;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        const amp = isPlaying
          ? Math.abs(Math.sin((i * 0.3) + phase)) * (height * 0.4) + 6
          : 6;

        if (abMode === 'original') {
          ctx.fillStyle = "#94a3b8"; // neutral slate
        } else if (abMode === 'vocals') {
          ctx.fillStyle = "#38bdf8"; // sky blue vocals
        } else {
          ctx.fillStyle = "#f43f5e"; // rose crimson instrumental
        }

        ctx.fillRect(x, centerY - amp / 2, barWidth, amp);
      }

      if (isPlaying) phase += 0.12;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, abMode]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
      {/* Header and status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Waves className="w-4 h-4 text-rose-500" />
            <span>محرك فصل الصوت الحقيقي عن الموسيقى (مجاني داخل المتصفح)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            يقوم بفصل الصوت الحقيقي للملف إلى مسار الحوار (Vocals) ومسار الموسيقى (BGM) بدون أصوات مصطنعة
          </p>
        </div>

        {separationResult ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                isVerified
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                  : "bg-amber-950/40 border-amber-800 text-amber-300"
              }`}
            >
              {isVerified ? "تمت المراجعة والاعتماد" : "needs_review (بحاجة لمراجعة A/B)"}
            </span>
            {!isVerified && (
              <button
                onClick={() => setIsVerified(true)}
                className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer"
              >
                اعتماد النتيجة
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* File Source Selector Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Option 1: From Video in Tab 1 */}
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>فصل صوت الفيديو المرفوع في المشروع</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {originalAudioUrl
                ? originalAudioUrl.includes("youtube.com") || originalAudioUrl.includes("youtu.be")
                  ? "الرابط الحالي يوتيوب؛ لفصل الصوت الخام الحقيقي يرجى رفع ملف الفيديو مباشرة من جهازك."
                  : "يوجد ملف فيديو محلي مرفوع بالفعل في المشروع، جاهز للفصل الآن."
                : "لم يتم رفع فيديو محلي في شاشة المشروع بعد."}
            </p>
          </div>

          <button
            onClick={separateUploadedVideo}
            disabled={!originalAudioUrl || isProcessing}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>فصل صوت فيديو المشروع</span>
          </button>
        </div>

        {/* Option 2: Upload direct file here */}
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileAudio className="w-3.5 h-3.5 text-rose-400" />
              <span>رفع أي ملف فيديو أو صوت مستقل</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              ارفع ملف أنمي (MP4, WebM, MP3, WAV) لمعالجة صوته وفصل الموسيقى عن كلام الممثلين.
            </p>
          </div>

          <label className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-dashed border-slate-700 hover:border-rose-500 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-200 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-rose-500" />
            <span className="truncate">{selectedFileName ? `الملف: ${selectedFileName}` : "اختيار ملف صوت أو فيديو محلي"}</span>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Option 3: Instant 1-Click Demo */}
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>تجربة فورية لعينة أنمي (1-Click Demo)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              اختبر محرك الفصل فوراً بدون الحاجة لرفع ملفات، واستمع لنقاء عزل الحوار والموسيقى.
            </p>
          </div>

          <button
            onClick={runDemoSeparation}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/80 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تشغيل تجربة العينة الفورية</span>
          </button>
        </div>
      </div>

      {/* Progress state */}
      {isProcessing && (
        <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{progressStep}</span>
            <span className="font-mono tabular-nums">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stem separation interface once separated */}
      {separationResult && (
        <div className="space-y-4">
          {/* Waveform & A/B Selector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="text-xs text-slate-300 font-mono tabular-nums">
                  المدة المعالجة: {separationResult.duration}s · معدل العينات: {separationResult.sampleRate} Hz
                </div>
              </div>

              {/* A/B Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => handleAbSwitch('original')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    abMode === 'original'
                      ? 'bg-slate-700 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الخليط الأصلي (A)
                </button>
                <button
                  onClick={() => handleAbSwitch('instrumental')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    abMode === 'instrumental'
                      ? 'bg-rose-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الموسيقى المعزولة (B - BGM)
                </button>
                <button
                  onClick={() => handleAbSwitch('vocals')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    abMode === 'vocals'
                      ? 'bg-sky-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  كلام الشخصيات المعزول
                </button>
              </div>
            </div>

            {/* Visualizer Canvas */}
            <div className="h-14 w-full bg-slate-900/50 rounded-lg overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={600}
                height={56}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Stem Mixer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Stem 1: Original Vocals control */}
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">مسار الحوار الأصلي (Original Vocals)</span>
                <button
                  onClick={() => setIsDialogueMuted(!isDialogueMuted)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    isDialogueMuted
                      ? "bg-rose-950/60 border border-rose-800 text-rose-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {isDialogueMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  <span>{isDialogueMuted ? "مكتوم (Muted)" : "مفعل"}</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
                  <span>مستوى خفض الصوت الأصلي للدبلجة</span>
                  <span>{isDialogueMuted ? "-∞ dB (كتم تام)" : `${Math.round(dialogueVolume * 100)}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={isDialogueMuted}
                  value={isDialogueMuted ? 0 : dialogueVolume}
                  onChange={(e) => setDialogueVolume(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer disabled:opacity-40"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                يُنصح بكتم الحوار الأصلي تماماً لمنع تداخل الصوت الياباني مع الدبلجة المصرية الجديدة.
              </p>
            </div>

            {/* Stem 2: Instrumental / Music control */}
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">مسار الموسيقى والمؤثرات (BGM & SFX)</span>
                <span className="text-[11px] font-mono text-emerald-400 font-medium">مستخرج ونقي</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
                  <span>مستوى صوت الموسيقى في المزيج</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                يتم الإبقاء على الموسيقى مع تطبيق انخفاض ذكي (Auto-Ducking) تلقائياً عند حديث الراوي أو الشخصيات.
              </p>
            </div>
          </div>

          {/* Hidden audio elements */}
          {separationResult.instrumentalAudioUrl && (
            <audio
              ref={instAudioRef}
              src={separationResult.instrumentalAudioUrl}
              onEnded={() => setIsPlaying(false)}
            />
          )}
          {separationResult.vocalsAudioUrl && (
            <audio
              ref={vocalsAudioRef}
              src={separationResult.vocalsAudioUrl}
              onEnded={() => setIsPlaying(false)}
            />
          )}
          {originalAudioUrl && (
            <audio
              ref={originalAudioRef}
              src={originalAudioUrl}
              onEnded={() => setIsPlaying(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
