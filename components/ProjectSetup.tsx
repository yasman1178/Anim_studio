"use client";

import React, { useState } from "react";
import {
  NotebookLMProject,
  SAMPLE_PROJECT_SEIF_V18,
  SAMPLE_PROJECT_SOLO_LEVELING,
  SAMPLE_PROJECT_JUJUTSU,
} from "@/lib/sample-data";
import { ValidationResult, normalizeNotebookLMProject } from "@/lib/validate-json";
import { Upload, Film, FileJson, Link as LinkIcon, CheckCircle2, Sparkles, Code2, HardDrive, ShieldCheck } from "lucide-react";
import { saveMediaAsset } from "@/lib/project-storage";

interface ProjectSetupProps {
  project: NotebookLMProject;
  onUpdateProject: (proj: NotebookLMProject) => void;
  validation: ValidationResult | null;
  videoDuration: number | null;
  onVideoSelected: (url: string, duration: number) => void;
  videoUrl?: string | null;
  onOpenStorageManager?: () => void;
}

export function ProjectSetup({
  project,
  onUpdateProject,
  validation,
  videoDuration,
  onVideoSelected,
  videoUrl,
  onOpenStorageManager
}: ProjectSetupProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlStatus, setUrlStatus] = useState<'empty' | 'received' | 'needs_local'>('empty');
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [rawJsonText, setRawJsonText] = useState(JSON.stringify(project, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  // Handle explicit video URL loading (YouTube or direct video URL)
  const handleLoadVideoUrl = () => {
    if (!sourceUrl.trim()) return;
    const url = sourceUrl.trim();
    const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    const projectTotalSec = project.shots.reduce((acc, s) => acc + (Number(s.duration_sec ?? s.duration_seconds) || 5), 0);
    
    if (ytMatch && ytMatch[2].length === 11) {
      onVideoSelected(url, projectTotalSec || 18);
      setUrlStatus('received');
      return;
    }
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      onVideoSelected(url, video.duration || projectTotalSec || 18);
      setUrlStatus('received');
    };
    video.onerror = () => {
      onVideoSelected(url, projectTotalSec || 18);
      setUrlStatus('received');
    };
  };

  const handleClearUrl = () => {
    setSourceUrl("");
    setUrlStatus('empty');
  };

  // Handle preset project loader
  const loadPreset = (preset: NotebookLMProject) => {
    const normalized = normalizeNotebookLMProject(preset);
    onUpdateProject(normalized);
    setRawJsonText(JSON.stringify(normalized, null, 2));
    setSourceUrl("");
    setUrlStatus('empty');
  };

  // Handle custom JSON upload with automatic normalization and local storage save
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const normalized = normalizeNotebookLMProject(parsed);
        onUpdateProject(normalized);
        setRawJsonText(JSON.stringify(normalized, null, 2));
        setJsonError(null);

        // Save JSON to browser IndexedDB
        await saveMediaAsset({
          name: file.name,
          type: 'project_json',
          blob: file,
          mimeType: 'application/json',
          metadata: {
            notes: `مشروع: ${normalized.project_info?.title || 'بدون عنوان'}`
          }
        });
        setStorageNotice(`تم حفظ ملف المشروع «${file.name}» في ذاكرة المتصفح بنجاح!`);
        setTimeout(() => setStorageNotice(null), 4000);
      } catch (err) {
        setJsonError("خطأ في قراءة ملف JSON: " + String(err));
      }
    };
    reader.readAsText(file);
  };

  // Handle local video upload and save full video to IndexedDB
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = async () => {
      onVideoSelected(url, video.duration);

      // Save full video into browser IndexedDB
      try {
        await saveMediaAsset({
          name: file.name,
          type: 'full_video',
          blob: file,
          mimeType: file.type || 'video/mp4',
          metadata: {
            originalFileName: file.name,
            duration: video.duration || undefined,
          }
        });
        setStorageNotice(`تم حفظ كامل ملف الفيديو «${file.name}» (${(file.size / (1024 * 1024)).toFixed(1)} م.ب) في ذاكرة المتصفح بنجاح!`);
        setTimeout(() => setStorageNotice(null), 5000);
      } catch (err) {
        console.error("Failed to store video in IndexedDB:", err);
      }
    };
  };

  // Apply raw JSON edits with normalization
  const applyJsonEdits = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      const normalized = normalizeNotebookLMProject(parsed);
      onUpdateProject(normalized);
      setRawJsonText(JSON.stringify(normalized, null, 2));
      setJsonError(null);
      setShowJsonEditor(false);
    } catch {
      setJsonError("صيغة الـ JSON غير صحيحة، تأكد من الأقواس والفواصل.");
    }
  };

  return (
    <div className="w-full max-w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="space-y-1 pb-3 border-b border-slate-800">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Film className="w-4 h-4 text-rose-500" />
          <span>إعداد المشروع والوسائط (Project & Media)</span>
        </h3>
        <p className="text-xs text-slate-400">
          حدد مصدر الفيديو أو ارفع ملفك، واختر سيناريو الدبلجة v18 المعتمد لقناة «محب أنمي»
        </p>
      </div>

      {/* Preset Project Loaders - Responsive Grid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>اختر مشروعاً جاهزاً للبدء الفوري:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => loadPreset(SAMPLE_PROJECT_SEIF_V18)}
            className="p-3 rounded-xl text-right bg-rose-950/40 border border-rose-500/50 hover:border-rose-400 text-rose-100 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-rose-200">★ حكاية سيف (الحلقة 4)</div>
            <div className="text-[11px] text-rose-300/80 mt-0.5 font-mono">Shorts 9:16 · إيقاع Beats</div>
          </button>
          <button
            onClick={() => loadPreset(SAMPLE_PROJECT_SOLO_LEVELING)}
            className="p-3 rounded-xl text-right bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-slate-100">سولو ليفلينج (3 لقطات)</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">16 ثانية · دبلجة مصرية</div>
          </button>
          <button
            onClick={() => loadPreset(SAMPLE_PROJECT_JUJUTSU)}
            className="p-3 rounded-xl text-right bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-slate-100">جوجوتسو كايسن (قتال)</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">غوجو وسوكونا · لقطتان</div>
          </button>
        </div>
      </div>

      {/* Local Storage Notice Banner */}
      {storageNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{storageNotice}</span>
          </div>
          {onOpenStorageManager && (
            <button
              type="button"
              onClick={onOpenStorageManager}
              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shrink-0 cursor-pointer"
            >
              عرض الذاكرة
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Video Reference & JSON Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Video Reference & Local File Upload */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>مصدر الفيديو والمرجع</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              {videoUrl ? "فيديو جاهز" : "يتطلب تحديد فيديو"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label className="text-slate-400">رابط الفيديو (YouTube أو MP4 مباشر):</label>
              {sourceUrl && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  مسح
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => {
                  setSourceUrl(e.target.value);
                  setUrlStatus(e.target.value ? 'received' : 'empty');
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLoadVideoUrl();
                  }
                }}
                placeholder="رابط يوتيوب أو MP4..."
                className="w-full flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-sans"
              />
              <button
                type="button"
                onClick={handleLoadVideoUrl}
                disabled={!sourceUrl.trim()}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>تحميل</span>
              </button>
            </div>
            {videoUrl && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>تم ربط الفيديو بنجاح في شاشة المعاينة!</span>
                </div>
                {(videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-start gap-1.5 leading-snug">
                    <span className="font-bold shrink-0">تنبيه:</span>
                    <span>روابط YouTube للمعاينة البصرية فقط داخل المشغل؛ لمعالجة وفصل الصوت الحقيقي بدقة وتركيب الدبلجة، يرجى رفع ملف الفيديو MP4 من جهازك أدناه.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Local Upload file */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">أو ارفع ملف فيديو محلي (MP4/WebM):</span>
              {videoDuration && (
                <span className="text-emerald-400 font-mono tabular-nums">{Math.round(videoDuration)}s</span>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-rose-500 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 cursor-pointer transition-colors min-h-[44px]">
              <Upload className="w-3.5 h-3.5 text-rose-500" />
              <span>{videoUrl ? "تغيير ملف الفيديو المرفوع" : "اختيار ملف فيديو من جهازك"}</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Box 2: NotebookLM JSON Specification Upload */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>ملف سيناريو الجيسون (v18 JSON)</span>
            </span>
            <button
              onClick={() => setShowJsonEditor(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              <span>تعديل الكود</span>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">عنوان المشروع الحركي:</label>
            <input
              type="text"
              value={project.project_info.title || project.project_info.project_name || ""}
              onChange={(e) => {
                const updated = { ...project };
                updated.project_info.title = e.target.value;
                updated.project_info.project_name = e.target.value;
                onUpdateProject(updated);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-sans"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="text-[11px] text-slate-300 font-medium">استيراد ملف سيناريو جديد (.json):</div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-amber-500 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 cursor-pointer transition-colors min-h-[44px]">
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>رفع ملف JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonUpload}
                className="hidden"
              />
            </label>
            {jsonError && (
              <div className="text-[11px] text-rose-400">{jsonError}</div>
            )}
          </div>
        </div>
      </div>

      {/* Project Manifest Summary */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="text-xs font-semibold text-slate-300 mb-1.5">بيانات الإنتاج الحالية (Manifest):</div>
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs font-mono tabular-nums text-slate-400">
          <div>العمل: <span className="text-slate-200 font-sans">{project.project_info.title || project.project_info.anime_title}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>الحلقة: <span className="text-slate-200">#{project.project_info.episode || 1}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>القناة: <span className="text-rose-400 font-sans font-semibold">{project.project_info.default_channel}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>النسبة: <span className="text-cyan-400">{project.project_info.aspect_ratio || '9:16'}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>اللقطات: <span className="text-slate-200">{project.shots.length}</span></div>
        </div>
      </div>

      {/* JSON Editor Modal */}
      {showJsonEditor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 space-y-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                <span>محرر كود السيناريو JSON المباشر</span>
              </div>
              <button
                onClick={() => setShowJsonEditor(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer p-1"
              >
                إغلاق
              </button>
            </div>

            <textarea
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              className="flex-1 min-h-[300px] w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-rose-500 leading-normal"
            />

            {jsonError && (
              <div className="text-xs text-rose-400 p-2 rounded-lg bg-rose-950/30 border border-rose-900">
                {jsonError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowJsonEditor(false)}
                className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer min-h-[40px]"
              >
                إلغاء
              </button>
              <button
                onClick={applyJsonEdits}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer min-h-[40px]"
              >
                حفظ وتطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
