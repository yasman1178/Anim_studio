"use client";

import React, { useState, useEffect } from "react";
import { NotebookLMProject } from "@/lib/sample-data";
import { Youtube, Download, Copy, Check, ShieldCheck, Sparkles, AlertCircle, MessageSquareQuote, Image as ImageIcon } from "lucide-react";

interface PublishingHubProps {
  project: NotebookLMProject;
  durationSeconds: number;
}

export function PublishingHub({ project, durationSeconds }: PublishingHubProps) {
  const seo = project.seo;
  const initialTitle = seo?.title_options?.[0] || `ملخص ودبلجة ${project.project_info.title || project.project_info.anime_title || 'الأنمي'} - بالمصري`;
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(seo?.description || "");
  const [tags, setTags] = useState<string[]>(seo?.hashtags || ["محب_أنمي", "حكاية_سيف", "دبلجة_مصرية"]);
  const [privacyStatus, setPrivacyStatus] = useState<"unlisted" | "private" | "public">("unlisted");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showOAuthReview, setShowOAuthReview] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Initialize metadata via /api/youtube if project has no pre-defined seo
  useEffect(() => {
    if (seo) return;

    let isMounted = true;
    async function loadMeta() {
      try {
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anime_title: project.project_info.anime_title || project.project_info.title,
            episode: project.project_info.episode || 1,
            project_name: project.project_info.project_name || project.project_info.title,
            total_shots: project.shots.length,
            duration_seconds: durationSeconds
          })
        });
        const data = await res.json();
        if (data.publishing_metadata && isMounted) {
          setTitle(data.publishing_metadata.title);
          setDescription(data.publishing_metadata.description);
          setTags(data.publishing_metadata.tags);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();

    return () => {
      isMounted = false;
    };
  }, [project, durationSeconds, seo]);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const exportMetadataJson = () => {
    const metaObj = {
      channel: "محب أنمي",
      title,
      title_options: seo?.title_options || [title],
      description,
      tags,
      privacy_status: privacyStatus,
      series_meta: project.series_meta,
      project_name: project.project_info.project_name || project.project_info.title,
      total_shots: project.shots.length,
      duration_seconds: durationSeconds,
      thumbnail_prompt_en: seo?.thumbnail_prompt_en,
      pinned_comment: seo?.pinned_comment,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(metaObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `v18_publishing_${(project.project_info.title || 'anime').replace(/\s+/g, '_')}.json`;
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-rose-500" />
            <span>بيانات النشر والـ SEO — قناة «محب أنمي» (v18 Shorts)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            عناوين جذابة لرفع الـ CTR، ووسوم وخطة الخطاف لتثبيت المشاهد في أول 3 ثوانٍ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportMetadataJson}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير ملف v18 Metadata</span>
          </button>
        </div>
      </div>

      {/* V18 Title Options (A/B Testing) */}
      {seo?.title_options && seo.title_options.length > 0 && (
        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>خيارات العناوين لاختبار معدل النقر CTR (اختر العنوان الأنسب):</span>
          </div>
          <div className="space-y-1.5">
            {seo.title_options.map((opt, oIdx) => (
              <button
                key={oIdx}
                onClick={() => setTitle(opt)}
                className={`w-full text-right p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  title === opt
                    ? "bg-rose-950/50 border border-rose-500 text-rose-100 font-semibold"
                    : "bg-slate-900 border border-slate-800/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="truncate">{opt}</span>
                {title === opt && <span className="text-[10px] text-rose-400 shrink-0 font-mono">نشط</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Title & Privacy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>العنوان المختار للفيديو</span>
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
            className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-rose-500 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-300">مستوى الخصوصية</div>
          <select
            value={privacyStatus}
            onChange={(e) => setPrivacyStatus(e.target.value as any)}
            className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="unlisted">غير مدرج (Unlisted - الموصى به)</option>
            <option value="private">خاص (Private)</option>
            <option value="public">عام (Public)</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>الوصف وتنويه الاستخدام العادل</span>
          <button
            onClick={() => copyToClipboard(description, "desc")}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === "desc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSection === "desc" ? "تم النسخ" : "نسخ"}</span>
          </button>
        </div>
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500 font-sans leading-relaxed"
        />
      </div>

      {/* Pinned Comment & Thumbnail Prompt (v18) */}
      {(seo?.pinned_comment || seo?.thumbnail_prompt_en) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {seo?.pinned_comment && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                <MessageSquareQuote className="w-3 h-3" />
                <span>التعليق المثبت لفتح النقاش (Pinned Comment)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{seo.pinned_comment}</p>
            </div>
          )}
          {seo?.thumbnail_prompt_en && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                <span>برومبت الصورة المصغرة (9:16 Thumbnail)</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed line-clamp-3">{seo.thumbnail_prompt_en}</p>
            </div>
          )}
        </div>
      )}

      {/* Tags section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>الهاشتاجات والوسوم (SEO Tags)</span>
          <button
            onClick={() => copyToClipboard(tags.map(t => t.startsWith('#') ? t : `#${t}`).join(" "), "tags")}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {copiedSection === "tags" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSection === "tags" ? "تم نسخ الوسوم" : "نسخ الكل"}</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]"
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>

      {/* YouTube Safe Upload Option */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>الرفع المباشر لقناة «محب أنمي»</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
              تتم مراجعة ترخيص الاستخدام العادل وتعيين الخصوصية الافتراضية Unlisted لضمان أمان القناة.
            </p>
          </div>

          <button
            onClick={() => setShowOAuthReview(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer min-h-[44px]"
          >
            <Youtube className="w-4 h-4" />
            <span>مراجعة ورفع الشورتس</span>
          </button>
        </div>

        {uploadSuccess && (
          <div className="p-3 rounded-xl border border-emerald-800/60 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم تجهيز الفيديو والبيانات بنجاح للنشر على قناة «محب أنمي» كفيديو غير مدرج (Unlisted)!</span>
          </div>
        )}
      </div>

      {/* Modal / Dialog for YouTube Upload Confirmation */}
      {showOAuthReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-2xl">
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
                <div className="font-mono text-slate-300 truncate">العنوان: {title}</div>
                <div className="font-mono text-amber-400">الخصوصية: {privacyStatus} (حماية من النشر المفاجئ)</div>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>تأكيد حقوق الاستخدام العادل</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  أؤكد أن هذا العمل هو تكييف فني ودبلجة تعليقية غير رسمية متوافقة مع إرشادات اليوتيوب.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOAuthReview(false)}
                className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer min-h-[44px]"
              >
                رجوع
              </button>
              <button
                onClick={handleSimulateYouTubeUpload}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer min-h-[44px]"
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
