"use client";

import React, { useState } from "react";
import { ValidationResult } from "@/lib/validate-json";
import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Sparkles, Image as ImageIcon, Music, Volume2, ShieldAlert } from "lucide-react";

interface ValidationReportProps {
  validation: ValidationResult | null;
  videoDuration: number | null;
  onApplyFixes?: () => void;
}

export function ValidationReport({
  validation,
  videoDuration,
  onApplyFixes
}: ValidationReportProps) {
  const [showFixDiff, setShowFixDiff] = useState(false);

  if (!validation) {
    return (
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 text-sm text-center">
        قم برفع أو اختيار ملف JSON لعرض تقرير الفحص والتحقق الفوري.
      </div>
    );
  }

  const durationDiff = videoDuration !== null
    ? Math.round((videoDuration - validation.calculated_total_duration) * 10) / 10
    : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
      {/* Header status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {validation.is_valid ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ملف JSON صالح ومعتمد للإنتاج</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400 font-medium text-sm">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>يحتوي الملف على أخطاء هيكلية حرجة تمنع الرندر</span>
            </div>
          )}
        </div>

        {/* Clean unboxed metadata with separators */}
        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
          <span>اللقطات: {validation.total_shots}</span>
          <span aria-hidden="true">·</span>
          <span>مدة الـ JSON: {validation.calculated_total_duration}s</span>
          {videoDuration !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>مدة الفيديو: {videoDuration}s</span>
            </>
          )}
        </div>
      </div>

      {/* Duration Difference Alert if video mismatch */}
      {durationDiff !== null && Math.abs(durationDiff) > 1.0 && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">
              تنبيه فرق المدة الزمني ({durationDiff > 0 ? `الفيديو أطول بـ ${durationDiff}s` : `الفيديو أقصر بـ ${Math.abs(durationDiff)}s`})
            </div>
            <p className="text-amber-200/80 leading-relaxed">
              وفق المواصفة V19، عند اختلاف مدة الفيديو عن مدة JSON يتوقف التشغيل التلقائي. سيتم مزامنة الصوت الجديد على توقيت لقطات JSON مع الحفاظ على مدة العرض الأصلية.
            </p>
          </div>
        </div>
      )}

      {/* Issue list */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          تقرير الفحص التفصيلي ({validation.errors_count} أخطاء · {validation.warnings_count} تحذيرات)
        </div>

        {validation.issues.length === 0 ? (
          <div className="text-xs text-slate-400 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            جميع اللقطات والتوقيتات والنصوص المصرية سليمة 100% ومطابقة للمخطط.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {validation.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  issue.type === 'error'
                    ? 'border-rose-800/50 bg-rose-950/20 text-rose-200'
                    : issue.type === 'warning'
                    ? 'border-amber-800/50 bg-amber-950/20 text-amber-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300'
                }`}
              >
                {issue.type === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                ) : issue.type === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div>
                  {issue.shot_number && (
                    <span className="font-mono font-semibold ml-1.5 text-rose-300">
                      [لقطة #{issue.shot_number}]:
                    </span>
                  )}
                  <span>{issue.message_ar}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing Assets Inspector */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>فاحص الأصول المفقودة (Asset Integrity)</span>
          <span className="text-slate-500 font-mono text-[11px]">
            {validation.missing_assets.vfx.length + validation.missing_assets.sfx.length} متطلب
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>الصور</span>
            </div>
            <div className="font-semibold text-slate-200">
              {validation.missing_assets.images.length === 0 ? "متوفرة" : `${validation.missing_assets.images.length} تلقائية`}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>مؤثرات VFX</span>
            </div>
            <div className="font-semibold text-slate-200">
              {validation.missing_assets.vfx.length} برمجية نشطة
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>مؤثرات SFX</span>
            </div>
            <div className="font-semibold text-slate-200">
              {validation.missing_assets.sfx.length} متوفرة
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Music className="w-3.5 h-3.5 text-indigo-400" />
              <span>الموسيقى</span>
            </div>
            <div className="font-semibold text-slate-200">
              {validation.missing_assets.music.length > 0 ? "من الصوت المعزول" : "المسار الأصلي"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
