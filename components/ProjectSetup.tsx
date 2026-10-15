"use client";

import React, { useState } from "react";
import {
  NotebookLMProject,
  SAMPLE_PROJECT_SOLO_LEVELING,
  SAMPLE_PROJECT_JUJUTSU,
  SAMPLE_PROJECT_SOLO_LEVELING_SEASON_3
} from "@/lib/sample-data";
import { ValidationResult, normalizeNotebookLMProject } from "@/lib/validate-json";
import { Upload, Film, FileJson, Link as LinkIcon, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Code2 } from "lucide-react";

interface ProjectSetupProps {
  project: NotebookLMProject;
  onUpdateProject: (proj: NotebookLMProject) => void;
  validation: ValidationResult | null;
  videoDuration: number | null;
  onVideoSelected: (url: string, duration: number) => void;
  videoUrl?: string | null;
}

export function ProjectSetup({
  project,
  onUpdateProject,
  validation,
  videoDuration,
  onVideoSelected,
  videoUrl
}: ProjectSetupProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlStatus, setUrlStatus] = useState<'empty' | 'received' | 'needs_local'>('empty');
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [rawJsonText, setRawJsonText] = useState(JSON.stringify(project, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Handle explicit video URL loading (YouTube or direct video URL)
  const handleLoadVideoUrl = () => {
    if (!sourceUrl.trim()) return;
    const url = sourceUrl.trim();
    const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    if (ytMatch && ytMatch[2].length === 11) {
      onVideoSelected(url, 180);
      setUrlStatus('received');
      return;
    }
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      onVideoSelected(url, video.duration || 180);
      setUrlStatus('received');
    };
    video.onerror = () => {
      onVideoSelected(url, 180);
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

  // Handle custom JSON upload with automatic normalization
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const normalized = normalizeNotebookLMProject(parsed);
        onUpdateProject(normalized);
        setRawJsonText(JSON.stringify(normalized, null, 2));
        setJsonError(null);
      } catch (err) {
        setJsonError("خطأ في قراءة ملف JSON: " + String(err));
      }
    };
    reader.readAsText(file);
  };

  // Handle local video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      onVideoSelected(url, video.duration);
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
    } catch (err) {
      setJsonError("صيغة الـ JSON غير صحيحة، تأكد من الأقواس والفواصل.");
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
      {/* Header & Quick Sample Preset Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Film className="w-4 h-4 text-rose-500" />
            <span>إعداد المشروع والوسائط (Project & Source Input)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            التحقق من رابط الفيديو، ورفع ملف الفيديو المحلي، وتدقيق ملف NotebookLM JSON للدبلجة المصرية
          </p>
        </div>

        {/* 1-Click Sample Loaders */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">نماذج جاهزة:</span>
          <button
            onClick={() => loadPreset(SAMPLE_PROJECT_SOLO_LEVELING_SEASON_3)}
            className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/80 rounded-md transition-colors cursor-pointer"
          >
            ★ سولو ليفلينج الموسم 3 (3 دقائق)
          </button>
          <button
            onClick={() => loadPreset(SAMPLE_PROJECT_SOLO_LEVELING)}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            سولو ليفلينج (3 لقطات)
          </button>
          <button
            onClick={() => loadPreset(SAMPLE_PROJECT_JUJUTSU)}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
          >
            جوجوتسو كايسن (لقطتان)
          </button>
        </div>
      </div>

      {/* Main Grid: Video Reference & JSON Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Video Reference & Local File Upload (Spec V19 Principle 2) */}
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>مصدر الفيديو ورابط المرجع</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              {videoUrl ? "Media available" : urlStatus === 'received' ? "URL received" : "Needs local upload"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-400">رابط الفيديو المرجعي (YouTube / Direct MP4):</label>
              {sourceUrl && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  مسح الرابط
                </button>
              )}
            </div>
            <div className="flex gap-2">
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
                placeholder="ضع رابط فيديو يوتيوب أو MP4 هنا..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="button"
                onClick={handleLoadVideoUrl}
                disabled={!sourceUrl.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>تحميل ومعاينة الفيديو</span>
              </button>
            </div>
            {videoUrl && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تم تحميل الفيديو وعرضه بنجاح في شاشة المعاينة (Canvas)!</span>
              </div>
            )}
          </div>

          {/* Local Upload file as preferred by V19 */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-medium">رفع ملف الفيديو المحلي (المسار المفضل):</span>
              {videoDuration && (
                <span className="text-emerald-400 font-mono tabular-nums">{Math.round(videoDuration)}s</span>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-rose-500 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-rose-500" />
              <span>{videoUrl ? "تغيير ملف الفيديو المرفوع" : "اختيار ملف MP4 أو WebM محلي"}</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              وفقاً لمواصفات V19: لا يتم الاعتماد على الكشط غير القانوني؛ ارفع ملف الفيديو الأصلي الذي تملك إذن استخدامه.
            </p>
          </div>
        </div>

        {/* Box 2: NotebookLM JSON Specification Upload */}
        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>ملف مواصفات الدبلجة (NotebookLM JSON)</span>
            </span>
            <button
              onClick={() => setShowJsonEditor(true)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              <span>تعديل كود الـ JSON</span>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">اسم المشروع الحركي:</label>
            <input
              type="text"
              value={project.project_info.project_name}
              onChange={(e) => {
                const updated = { ...project };
                updated.project_info.project_name = e.target.value;
                onUpdateProject(updated);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-rose-500 font-sans"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="text-[11px] text-slate-300 font-medium">رفع ملف JSON جديد من NotebookLM:</div>
            <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-amber-500 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 cursor-pointer transition-colors">
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

      {/* Project KPI & Spec Summary (Clean unboxed text, no pill clutter) */}
      <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
        <div className="text-xs font-semibold text-slate-300 mb-2">ملخص بيانات الإنتاج (Project Manifest):</div>
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-mono tabular-nums text-slate-400">
          <div>الأنمي: <span className="text-slate-200 font-sans">{project.project_info.anime_title}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>الحلقة: <span className="text-slate-200">#{project.project_info.episode}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>القناة: <span className="text-rose-400 font-sans font-semibold">{project.project_info.default_channel}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>اللهجة: <span className="text-slate-200 font-sans">{project.project_info.target_language}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>نسبة العرض: <span className="text-slate-200">{project.project_info.aspect_ratio}</span></div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <div>إجمالي اللقطات: <span className="text-slate-200">{project.shots.length}</span></div>
        </div>
      </div>

      {/* JSON Editor Modal / Drawer */}
      {showJsonEditor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                <span>محرر كود NotebookLM JSON المباشر</span>
              </div>
              <button
                onClick={() => setShowJsonEditor(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              وفقاً لقواعد V19: لا يتم تعديل بنية الـ JSON بصمت. يمكنك تعديل الحوارات، اللقطات، أو التوقيتات يدوياً هنا ثم تطبيق التغييرات.
            </p>

            <textarea
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              className="flex-1 min-h-[300px] w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-rose-500 leading-normal"
            />

            {jsonError && (
              <div className="text-xs text-rose-400 p-2 rounded bg-rose-950/30 border border-rose-900">
                {jsonError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowJsonEditor(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={applyJsonEdits}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
              >
                حفظ وتحديث المشروع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
