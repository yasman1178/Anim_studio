"use client";

import React, { useState, useEffect } from "react";
import { NotebookLMProject } from "@/lib/sample-data";
import { Youtube, Download, Copy, Check, ShieldCheck, Share2, AlertCircle, ExternalLink } from "lucide-react";

interface PublishingHubProps {
  project: NotebookLMProject;
  durationSeconds: number;
}

export function PublishingHub({ project, durationSeconds }: PublishingHubProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [privacyStatus, setPrivacyStatus] = useState<"unlisted" | "private" | "public">("unlisted");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showOAuthReview, setShowOAuthReview] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Initialize metadata via /api/youtube
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anime_title: project.project_info.anime_title,
            episode: project.project_info.episode,
            project_name: project.project_info.project_name,
            total_shots: project.shots.length,
            duration_seconds: durationSeconds
          })
        });
        const data = await res.json();
        if (data.publishing_metadata) {
          setTitle(data.publishing_metadata.title);
          setDescription(data.publishing_metadata.description);
          setTags(data.publishing_metadata.tags);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();
  }, [project, durationSeconds]);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const exportMetadataJson = () => {
    const metaObj = {
      channel: "محب أنمي",
      title,
      description,
      tags,
      privacy_status: privacyStatus,
      project_name: project.project_info.project_name,
      total_shots: project.shots.length,
      duration_seconds: durationSeconds,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(metaObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `publishing_metadata_${project.project_info.anime_title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateYouTubeUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setShowOAuthReview(false);
      setUploadSuccess(true);
    }, 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-rose-500" />
            <span>بيانات النشر واليوتيوب — قناة «محب أنمي»</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            تجهيز وسوم السيو، وتنويه حقوق الملكية، وخيارات التصدير والرفع الرسمي بعد مراجعة الترخيص
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportMetadataJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير ملف Metadata JSON</span>
          </button>
        </div>
      </div>

      {/* Title & Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>عنوان الفيديو المقترح (YouTube Title)</span>
            <button
              onClick={() => copyToClipboard(title, "title")}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedSection === "title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSection === "title" ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-300">مستوى الخصوصية الافتراضي</div>
          <select
            value={privacyStatus}
            onChange={(e) => setPrivacyStatus(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="unlisted">غير مدرج (Unlisted - الموصى به للمراجعة)</option>
            <option value="private">خاص (Private)</option>
            <option value="public">عام (Public)</option>
          </select>
        </div>
      </div>

      {/* Description & Fair Use Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>الوصف وتنويه الاستخدام العادل (Description & Fair Use Notice)</span>
          <button
            onClick={() => copyToClipboard(description, "desc")}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === "desc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSection === "desc" ? "تم النسخ" : "نسخ"}</span>
          </button>
        </div>
        <textarea
          rows={7}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 font-sans leading-relaxed"
        />
      </div>

      {/* Tags section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>الوسوم والكلمات الدلالية لقناة «محب أنمي»</span>
          <button
            onClick={() => copyToClipboard(tags.join(", "), "tags")}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === "tags" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSection === "tags" ? "تم نسخ الوسوم" : "نسخ الكل كـ Tags"}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Optional YouTube OAuth Upload Section (V19 Safe Separation) */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>الربط مع YouTube Data API (اختياري ومفصول)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
              وفق المواصفات V19، عملية رفع الفيديو مفصولة تماماً عن تصدير البيانات ولا تتم إلا بموافقة صريحة ومراجعة للخصوصية.
            </p>
          </div>

          <button
            onClick={() => setShowOAuthReview(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>مراجعة ورفع الفيديو إلى يوتيوب</span>
          </button>
        </div>

        {uploadSuccess && (
          <div className="p-3 rounded-lg border border-emerald-800/60 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم تجهيز الفيديو والبيانات بنجاح للنشر على قناة «محب أنمي» كفيديو غير مدرج (Unlisted)!</span>
          </div>
        )}
      </div>

      {/* Modal / Dialog for YouTube Upload Confirmation */}
      {showOAuthReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Youtube className="w-4 h-4 text-rose-500" />
                <span>تأكيد الرفع لقناة محب أنمي</span>
              </div>
              <button
                onClick={() => setShowOAuthReview(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-200">ملخص الرفع:</div>
                <div className="font-mono text-slate-400">العنوان: {title}</div>
                <div className="font-mono text-amber-400">الخصوصية: {privacyStatus} (حماية من النشر العلني المفاجئ)</div>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>تأكيد حقوق الاستخدام</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  أؤكد أنني أملك حق استخدام هذا المقطع لأغراض الدبلجة والتعليق وأن المحتوى يتوافق مع سياسات يوتيوب للاستخدام العادل.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOAuthReview(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                رجوع
              </button>
              <button
                onClick={handleSimulateYouTubeUpload}
                disabled={isUploading}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isUploading ? "جارِ الرفع الآمن..." : "موافقة وبدء الرفع الآن"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
