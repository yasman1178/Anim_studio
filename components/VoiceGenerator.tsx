"use client";

import React, { useState } from "react";
import { NotebookLMProject } from "@/lib/sample-data";
import { saveAudioUrlAsset } from "@/lib/project-storage";
import { Mic, Play, Pause, RotateCw, Volume2, CheckCircle2, AlertTriangle, Sparkles, User, Settings2 } from "lucide-react";

interface VoiceGeneratorProps {
  project: NotebookLMProject;
  onUpdateProject: (updated: NotebookLMProject) => void;
}

function resolveVoiceSettings(speaker?: string, charKey?: string, voiceModel?: string, vocalCue?: string) {
  const norm = `${speaker || ''} ${charKey || ''} ${vocalCue || ''}`.toLowerCase();
  if (norm.includes('سارة') || norm.includes('sara') || norm.includes('salma')) {
    return {
      voice: 'ar-EG-SalmaNeural',
      pitch: '+2Hz',
      rate: '+4%'
    };
  }
  if (norm.includes('كمال') || norm.includes('kamal') || norm.includes('beast') || norm.includes('وحش') || norm.includes('وحوش')) {
    return {
      voice: 'ar-SA-HamedNeural',
      pitch: '-15Hz',
      rate: '-5%'
    };
  }
  if (norm.includes('نظام') || norm.includes('system')) {
    return {
      voice: 'ar-AE-HamdanNeural',
      pitch: '-5Hz',
      rate: '-5%'
    };
  }
  return {
    voice: voiceModel || 'ar-EG-ShakirNeural',
    pitch: '+0Hz',
    rate: '+6%'
  };
}

export function VoiceGenerator({ project, onUpdateProject }: VoiceGeneratorProps) {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [totalLinesCount, setTotalLinesCount] = useState(0);
  const [activeGeneratingId, setActiveGeneratingId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Generate single line audio via /api/tts
  const generateLineVoice = async (shotIndex: number, lineIndex: number) => {
    const shot = project.shots[shotIndex];
    const line = shot.dialogue[lineIndex];
    if (!line) return;

    const lineId = line.id || `shot_${shotIndex + 1}_dlg_${lineIndex + 1}`;
    setActiveGeneratingId(lineId);
    setTtsError(null);

    const spokenText = line.line || line.line_egyptian || "";

    try {
      const vocalCue = line.voice_profile || line.vocal_cue || shot.vocal_cue || "narrator";
      const charKey = line.character || line.speaker || "seif";
      const voiceSettings = resolveVoiceSettings(line.speaker, charKey, line.voice_model, vocalCue);

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: spokenText,
          vocal_cue: vocalCue,
          voice: voiceSettings.voice,
          pitch: voiceSettings.pitch,
          rate: voiceSettings.rate
        })
      });

      const data = await res.json();
      if (data.success && data.audio_url) {
        const updatedProject = { ...project };
        updatedProject.shots[shotIndex].dialogue[lineIndex] = {
          ...line,
          audio_url: data.audio_url,
          duration_sec: data.duration_seconds,
          status: 'done'
        };
        onUpdateProject(updatedProject);

        // Save generated dialogue to IndexedDB storage
        saveAudioUrlAsset(
          data.audio_url,
          `دبلجة [${charKey}] - لقطة ${shotIndex + 1}.mp3`,
          'tts_audio',
          { shotIndex, role: charKey, duration: data.duration_seconds }
        );

        // Auto play generated audio
        playAudio(lineId, data.audio_url, spokenText);
      } else {
        setTtsError(`فشل توليد صوت ${line.speaker || 'الشخصية'} عبر خادم Edge-TTS: ${data?.error || "خطأ غير معروف في الخادم"}`);
      }
    } catch (err: any) {
      console.error("TTS generation error:", err);
      setTtsError(`تعذر الاتصال بخادم Edge-TTS: ${err?.message || String(err)}`);
    } finally {
      setActiveGeneratingId(null);
    }
  };

  // Generate Voiceover line with v18 vocal_cue
  const generateVoiceover = async (shotIndex: number) => {
    const shot = project.shots[shotIndex];
    if (!shot.voiceover_egyptian) return;

    const voId = `vo_${shot.shot_number}`;
    setActiveGeneratingId(voId);
    setTtsError(null);

    try {
      const vocalCue = shot.vocal_cue || "narrator";
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: shot.voiceover_egyptian,
          vocal_cue: vocalCue,
          voice: "ar-EG-ShakirNeural",
          pitch: "+0Hz",
          rate: "+8%"
        })
      });

      const data = await res.json();
      if (data.success && data.audio_url) {
        const updatedProject = { ...project };
        updatedProject.shots[shotIndex] = {
          ...updatedProject.shots[shotIndex],
          voiceover_audio_url: data.audio_url
        };
        onUpdateProject(updatedProject);

        saveAudioUrlAsset(
          data.audio_url,
          `صوت الراوي - لقطة ${shotIndex + 1}.mp3`,
          'tts_audio',
          { shotIndex, role: 'الراوي', duration: data.duration_seconds }
        );
        playAudio(voId, data.audio_url, shot.voiceover_egyptian);
      } else {
        setTtsError(`فشل توليد صوت الراوي عبر خادم Edge-TTS: ${data?.error || "خطأ في السيرفر"}`);
      }
    } catch (err: any) {
      console.error("Voiceover TTS error:", err);
      setTtsError(`تعذر الاتصال بخادم Edge-TTS لتوليد صوت الراوي: ${err?.message || String(err)}`);
    } finally {
      setActiveGeneratingId(null);
    }
  };

  // Generate all lines sequentially (both voiceovers and dialogues)
  const generateAllVoices = async () => {
    setIsGeneratingAll(true);
    setTtsError(null);
    let count = 0;
    
    // Total count of voiceovers + dialogues
    const total = project.shots.reduce((acc, s) => acc + (s.voiceover_egyptian ? 1 : 0) + s.dialogue.length, 0);
    setTotalLinesCount(total);
    setProgressCount(0);

    const updatedProject = { ...project };
    for (let sIdx = 0; sIdx < updatedProject.shots.length; sIdx++) {
      const shot = updatedProject.shots[sIdx];

      // 1. Generate Voiceover for this shot if present
      if (shot.voiceover_egyptian) {
        const voId = `vo_${shot.shot_number}`;
        setActiveGeneratingId(voId);
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: shot.voiceover_egyptian,
              vocal_cue: shot.vocal_cue || "narrator",
              voice: "ar-EG-ShakirNeural",
              pitch: "+0Hz",
              rate: "+8%"
            })
          });
          const data = await res.json();
          if (data.success && data.audio_url) {
            updatedProject.shots[sIdx] = {
              ...updatedProject.shots[sIdx],
              voiceover_audio_url: data.audio_url
            };
            onUpdateProject({ ...updatedProject });
            saveAudioUrlAsset(
              data.audio_url,
              `صوت الراوي - لقطة ${sIdx + 1}.mp3`,
              'tts_audio',
              { shotIndex: sIdx, role: 'الراوي', duration: data.duration_seconds }
            );
          } else {
            setTtsError(`فشل توليد صوت الراوي في لقطة #${shot.shot_number}: ${data.error || 'خطأ في خادم Edge-TTS'}`);
          }
        } catch (e: any) {
          console.error("Error generating voiceover:", e);
          setTtsError(`فشل الاتصال بخادم Edge-TTS لتوليد صوت الراوي: ${e?.message || String(e)}`);
        }
        count++;
        setProgressCount(count);
      }

      // 2. Generate each Dialogue line for this shot
      for (let dIdx = 0; dIdx < shot.dialogue.length; dIdx++) {
        const line = shot.dialogue[dIdx];
        const lineId = line.id || `shot_${sIdx + 1}_dlg_${dIdx + 1}`;
        setActiveGeneratingId(lineId);

        try {
          const charKey = line.character || line.speaker || "seif";
          const voiceSettings = resolveVoiceSettings(line.speaker, charKey, line.voice_model, line.vocal_cue || shot.vocal_cue);
          const spokenText = line.line || line.line_egyptian || "";

          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: spokenText,
              vocal_cue: line.voice_profile || line.vocal_cue || shot.vocal_cue || "narrator",
              voice: voiceSettings.voice,
              pitch: voiceSettings.pitch,
              rate: voiceSettings.rate
            })
          });

          const data = await res.json();
          if (data.success && data.audio_url) {
            updatedProject.shots[sIdx].dialogue[dIdx] = {
              ...line,
              audio_url: data.audio_url,
              duration_sec: data.duration_seconds,
              status: 'done'
            };
            onUpdateProject({ ...updatedProject });

            saveAudioUrlAsset(
              data.audio_url,
              `دبلجة [${line.speaker || charKey}] - لقطة ${sIdx + 1}.mp3`,
              'tts_audio',
              { shotIndex: sIdx, role: line.speaker || charKey, duration: data.duration_seconds }
            );
          } else {
            setTtsError(`فشل توليد صوت الحوار في لقطة #${shot.shot_number}: ${data.error || 'خطأ في خادم Edge-TTS'}`);
          }
        } catch (e: any) {
          console.error("Error generating for line:", lineId, e);
          setTtsError(`فشل الاتصال بخادم Edge-TTS: ${e?.message || String(e)}`);
        }

        count++;
        setProgressCount(count);
      }
    }

    setIsGeneratingAll(false);
    setActiveGeneratingId(null);
  };

  const playAudio = (id: string, url?: string, fallbackText?: string) => {
    if (playingAudioId === id) {
      audioElement?.pause();
      setPlayingAudioId(null);
      return;
    }

    audioElement?.pause();

    if (url) {
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => {
        setTtsError("تعذر تشغيل المقطع الصوتي، قد يكون الرابط منتهي الصلاحية.");
        setPlayingAudioId(null);
      };
      audio.play().then(() => {
        setAudioElement(audio);
        setPlayingAudioId(id);
      }).catch((e) => {
        console.error("Audio playback error:", e);
        setTtsError("تعذر تشغيل المقطع في المتصفح. تأكد من تفعيل أذونات الصوت.");
        setPlayingAudioId(null);
      });
    } else {
      setTtsError("لم يتم توليد ملف صوتي لهذا المقطع بعد. انقر على «نطق فوري» لتوليده عبر Edge-TTS.");
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-5">
      {/* Header and Batch Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Mic className="w-4 h-4 text-rose-500" />
            <span>محرك الدبلجة المصرية ونطق الشخصيات (Natural Arabic TTS)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            توليد كلام بشري عربي ونطق حقيقي لممثلين باللهجة المصرية مع قياس التوقيت ومزامنة اللقطات
          </p>
        </div>

        <button
          onClick={generateAllVoices}
          disabled={isGeneratingAll}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
        >
          {isGeneratingAll ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>جارِ توليد المقاطع ({progressCount} / {totalLinesCount})...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>توليد كل أصوات الحوار والراوي دفعة واحدة</span>
            </>
          )}
        </button>
      </div>

      {/* Explicit TTS Error Notice */}
      {ttsError && (
        <div className="p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{ttsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setTtsError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Character Voice Mapping Config */}
      <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          <span>مصفوفة أصوات الشخصيات المعرفة (Voice Mapping)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {Object.entries(project.character_voice_mapping || {}).map(([charKey, mapping]) => (
            <div
              key={charKey}
              className="p-2.5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-slate-200">{mapping.character_ar || charKey}</div>
                <div className="text-[11px] font-mono text-slate-400">{mapping.voice_name}</div>
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 text-left">
                <div>طبقة: {mapping.pitch || "+0Hz"}</div>
                <div>سرعة: {mapping.rate || "+0%"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shot-by-Shot Dialogue List */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-300">
          قائمة المقاطع الصوتية والحوارات لكل لقطة (اضغط على زر الاستماع لسماع النطق البشري فوراً)
        </div>

        {project.shots.map((shot, sIdx) => {
          const voId = `vo_${shot.shot_number}`;
          const isPlayingVo = playingAudioId === voId;
          const isGeneratingVo = activeGeneratingId === voId;

          return (
            <div
              key={shot.shot_number}
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5"
            >
              {/* Shot header */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-300">
                  <span className="font-mono text-rose-400 font-bold">لقطة #{shot.shot_number}</span>
                  <span className="text-slate-500 font-mono tabular-nums">({shot.timeframe})</span>
                  <span className="text-slate-500 font-mono tabular-nums">المدة: {shot.duration_seconds}s</span>
                </div>
                {shot.text_overlay && (
                  <span className="text-[11px] text-slate-400">
                    العنوان الظاهر: &quot;{shot.text_overlay}&quot;
                  </span>
                )}
              </div>

              {/* Voiceover line if present */}
              {shot.voiceover_egyptian && (
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
                      <User className="w-3.5 h-3.5" />
                      <span>الراوي (صوت تعليق خلفي):</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-sans">
                      {shot.voiceover_egyptian}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-1">
                    <button
                      onClick={() => generateVoiceover(sIdx)}
                      disabled={isGeneratingVo}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                      title="استماع لصوت الراوي"
                    >
                      {isPlayingVo ? (
                        <Pause className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Dialogue lines */}
              <div className="space-y-2">
                {shot.dialogue.map((line, dIdx) => {
                  const lineId = line.id || `shot_${sIdx + 1}_dlg_${dIdx + 1}`;
                  const isOverDuration = (line.duration_sec ?? 0) > (shot.duration_sec ?? shot.duration_seconds);
                  const isGenerating = activeGeneratingId === lineId;
                  const isPlaying = playingAudioId === lineId;
                  const spokenText = line.line || line.line_egyptian || "";
                  const speakerLabel = line.speaker || line.character_ar || line.character || "سيف";
                  const vocalCue = line.voice_profile || line.vocal_cue;

                  return (
                    <div
                      key={lineId}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{speakerLabel}</span>
                          {vocalCue && (
                            <span className="text-[11px] text-amber-400/90 font-mono">
                              ({vocalCue})
                            </span>
                          )}
                          <span className="text-[11px] font-mono tabular-nums text-slate-400">
                            يبدأ عند: {line.trigger_sec}s
                          </span>
                        </div>
                        <p className="text-slate-100 font-medium text-[13px] leading-relaxed">
                          &quot;{spokenText}&quot;
                        </p>
                        {line.line_original && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            الأصل: {line.line_original}
                          </div>
                        )}
                      </div>

                      {/* Controls & Duration */}
                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px] font-mono tabular-nums">
                          <div className={isOverDuration ? "text-amber-400 font-semibold" : "text-slate-300"}>
                            المدة: {line.duration_sec}s
                          </div>
                          {isOverDuration && (
                            <div className="text-[10px] text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>يتجاوز مدة اللقطة!</span>
                            </div>
                          )}
                        </div>

                        {/* Play preview button */}
                        <button
                          onClick={() => {
                            if (line.audio_url) {
                              playAudio(lineId, line.audio_url, spokenText);
                            } else {
                              generateLineVoice(sIdx, dIdx);
                            }
                          }}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          title="استماع للنطق البشري"
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px] font-sans">
                            {line.audio_url ? "استماع" : "نطق فوري"}
                          </span>
                        </button>

                        {/* Re-generate single line */}
                        <button
                          onClick={() => generateLineVoice(sIdx, dIdx)}
                          disabled={isGenerating || isGeneratingAll}
                          className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                          title="إعادة توليد وتنزيل المقطع"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin text-rose-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
