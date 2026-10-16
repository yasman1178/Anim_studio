"use client";

import React, { useState, useMemo } from "react";
import { NotebookLMProject } from "@/lib/sample-data";
import { saveAudioUrlAsset } from "@/lib/project-storage";
import {
  Mic,
  Play,
  Pause,
  RotateCw,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  User,
  Settings2,
  Bot,
  Send,
  MessageSquare,
  Sliders,
  Check,
  AlertCircle,
} from "lucide-react";

interface VoiceGeneratorProps {
  project: NotebookLMProject;
  onUpdateProject: (updated: NotebookLMProject) => void;
}

// Predefined available Edge-TTS Arabic Neural Voices
export const AVAILABLE_VOICES = [
  { id: "ar-EG-ShakirNeural", name: "شاكر (مصري - شاب بطولي / بطل الرواية)", gender: "male" },
  { id: "ar-EG-SalmaNeural", name: "سلمى (مصري - أنثوي رقيق / بطلة القصة)", gender: "female" },
  { id: "ar-SA-HamedNeural", name: "حامد (عربي فخم - وحوش وعمالقة / نبرة ثقيلة)", gender: "deep_male" },
  { id: "ar-AE-HamdanNeural", name: "حمدان (خليجي ناعم - نظام ذكاء اصطناعي إلكتروني)", gender: "system" },
];

export interface CharacterVoiceMapping {
  characterName: string;
  voiceId: string;
  pitch: string;
  rate: string;
}

export function VoiceGenerator({ project, onUpdateProject }: VoiceGeneratorProps) {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [totalLinesCount, setTotalLinesCount] = useState(0);
  const [activeGeneratingId, setActiveGeneratingId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Character Voice Mapping State (maps character name -> settings)
  const [voiceMappings, setVoiceMappings] = useState<Record<string, { voiceId: string; pitch: string; rate: string }>>({
    "سيف": { voiceId: "ar-EG-ShakirNeural", pitch: "+0Hz", rate: "+8%" },
    "سارة": { voiceId: "ar-EG-SalmaNeural", pitch: "+2Hz", rate: "+4%" },
    "كمال": { voiceId: "ar-SA-HamedNeural", pitch: "-15Hz", rate: "-5%" },
    "وحش الظلال": { voiceId: "ar-SA-HamedNeural", pitch: "-18Hz", rate: "-8%" },
    "النظام": { voiceId: "ar-AE-HamdanNeural", pitch: "-5Hz", rate: "-5%" },
    "الراوي": { voiceId: "ar-EG-ShakirNeural", pitch: "+0Hz", rate: "+6%" },
  });

  // Extract all distinct characters from project shots
  const detectedCharacters = useMemo(() => {
    const chars = new Set<string>(["الراوي"]);
    project.shots.forEach((shot) => {
      if (shot.voiceover_egyptian) chars.add("الراوي");
      shot.dialogue?.forEach((dlg) => {
        const name = dlg.speaker || dlg.character || dlg.character_ar || "سيف";
        chars.add(name);
      });
    });
    return Array.from(chars);
  }, [project.shots]);

  // AI Dubbing Director Bot State
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botPrompt, setBotPrompt] = useState("");
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [botMessages, setBotMessages] = useState<Array<{ role: "user" | "bot"; text: string; error?: boolean }>>([
    {
      role: "bot",
      text: "أهلاً بك يا فنان! أنا مساعد مخرج الدبلجة الذكي لقناة «محب أنمي». أقدر أساعدك في صياغة إفيهات مصرية، أو ضبط توقيت الجمل، أو إعادة كتابة أي مشهد بلهجة شبابية سلسة. اطلب مني أي شيء!",
    },
  ]);

  // Resolve voice settings using user mappings or smart fallbacks
  const getVoiceForCharacter = (speakerName: string) => {
    if (voiceMappings[speakerName]) {
      return voiceMappings[speakerName];
    }
    const norm = speakerName.toLowerCase();
    if (norm.includes("سارة") || norm.includes("salma") || norm.includes("فتاة") || norm.includes("انثى")) {
      return { voiceId: "ar-EG-SalmaNeural", pitch: "+2Hz", rate: "+4%" };
    }
    if (norm.includes("كمال") || norm.includes("وحش") || norm.includes("عملاق")) {
      return { voiceId: "ar-SA-HamedNeural", pitch: "-15Hz", rate: "-5%" };
    }
    if (norm.includes("نظام") || norm.includes("system") || norm.includes("ذكاء")) {
      return { voiceId: "ar-AE-HamdanNeural", pitch: "-5Hz", rate: "-5%" };
    }
    return { voiceId: "ar-EG-ShakirNeural", pitch: "+0Hz", rate: "+6%" };
  };

  const handleUpdateMapping = (charName: string, field: "voiceId" | "pitch" | "rate", value: string) => {
    setVoiceMappings((prev) => {
      const current = prev[charName] || getVoiceForCharacter(charName);
      return {
        ...prev,
        [charName]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Preview character voice sample
  const previewVoiceSample = async (charName: string) => {
    const config = getVoiceForCharacter(charName);
    const sampleText =
      config.voiceId === "ar-EG-SalmaNeural"
        ? "أنا جاهزة، خليك ورايا وشوف سحري!"
        : config.voiceId === "ar-SA-HamedNeural"
        ? "لن تخرج حياً من هذا الكهف أيها المتسلل!"
        : config.voiceId === "ar-AE-HamdanNeural"
        ? "تنبيه من النظام: تم رصد طاقة سحرية غير مستقرة."
        : "أهلاً بيكم في قناة محب أنمي، جاهزين للأكشن والإثارة!";

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
          voice: config.voiceId,
          pitch: config.pitch,
          rate: config.rate,
        }),
      });
      const data = await res.json();
      if (data.audio_url) {
        playAudio(`sample_${charName}`, data.audio_url);
      }
    } catch (e) {
      console.error("Failed to preview voice:", e);
    }
  };

  // Play audio helper
  const playAudio = (id: string, url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
    setAudioElement(audio);
    setPlayingAudioId(id);
    audio.play().catch(() => setPlayingAudioId(null));
  };

  // Generate single line audio via /api/tts
  const generateLineVoice = async (shotIndex: number, lineIndex: number) => {
    const shot = project.shots[shotIndex];
    const line = shot.dialogue[lineIndex];
    if (!line) return;

    const lineId = line.id || `shot_${shotIndex + 1}_dlg_${lineIndex + 1}`;
    setActiveGeneratingId(lineId);
    setTtsError(null);

    const spokenText = line.line || line.line_egyptian || "";
    const charKey = line.character || line.speaker || line.character_ar || "سيف";
    const voiceSettings = getVoiceForCharacter(charKey);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: spokenText,
          vocal_cue: line.voice_profile || line.vocal_cue || "narrator",
          voice: voiceSettings.voiceId,
          pitch: voiceSettings.pitch,
          rate: voiceSettings.rate,
        }),
      });

      const data = await res.json();
      if (data.success && data.audio_url) {
        const updatedProject = { ...project };
        updatedProject.shots[shotIndex].dialogue[lineIndex] = {
          ...line,
          audio_url: data.audio_url,
          duration_sec: data.duration_seconds,
          status: "done",
        };
        onUpdateProject(updatedProject);

        saveAudioUrlAsset(
          data.audio_url,
          `دبلجة [${charKey}] - لقطة ${shotIndex + 1}.mp3`,
          "tts_audio",
          { shotIndex, role: charKey, duration: data.duration_seconds }
        );

        playAudio(lineId, data.audio_url);
      } else {
        setTtsError(`فشل توليد صوت [${charKey}]: ${data?.error || "خطأ غير معروف في الخادم"}`);
      }
    } catch (err: any) {
      console.error("TTS generation error:", err);
      setTtsError(`تعذر الاتصال بخادم Edge-TTS: ${err?.message || String(err)}`);
    } finally {
      setActiveGeneratingId(null);
    }
  };

  // Generate Voiceover line
  const generateVoiceover = async (shotIndex: number) => {
    const shot = project.shots[shotIndex];
    if (!shot.voiceover_egyptian) return;

    const voId = `vo_${shot.shot_number}`;
    setActiveGeneratingId(voId);
    setTtsError(null);

    const narratorVoice = getVoiceForCharacter("الراوي");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: shot.voiceover_egyptian,
          vocal_cue: shot.vocal_cue || "narrator",
          voice: narratorVoice.voiceId,
          pitch: narratorVoice.pitch,
          rate: narratorVoice.rate,
        }),
      });

      const data = await res.json();
      if (data.success && data.audio_url) {
        const updatedProject = { ...project };
        updatedProject.shots[shotIndex] = {
          ...updatedProject.shots[shotIndex],
          voiceover_audio_url: data.audio_url,
        };
        onUpdateProject(updatedProject);

        saveAudioUrlAsset(
          data.audio_url,
          `صوت الراوي - لقطة ${shot.shot_number}.mp3`,
          "tts_audio",
          { shotIndex, role: "narrator", duration: data.duration_seconds }
        );

        playAudio(voId, data.audio_url);
      } else {
        setTtsError(`فشل توليد صوت الراوي: ${data?.error || "خطأ غير معروف"}`);
      }
    } catch (err: any) {
      setTtsError(`تعذر الاتصال بخادم Edge-TTS: ${err?.message || String(err)}`);
    } finally {
      setActiveGeneratingId(null);
    }
  };

  // Batch generate all missing voices
  const generateAllVoices = async () => {
    setIsGeneratingAll(true);
    setTtsError(null);

    const allLines: Array<{ shotIndex: number; lineIndex?: number; type: "dlg" | "vo" }> = [];
    project.shots.forEach((shot, sIdx) => {
      if (shot.voiceover_egyptian && !shot.voiceover_audio_url) {
        allLines.push({ shotIndex: sIdx, type: "vo" });
      }
      shot.dialogue?.forEach((dlg, dIdx) => {
        if (!dlg.audio_url) {
          allLines.push({ shotIndex: sIdx, lineIndex: dIdx, type: "dlg" });
        }
      });
    });

    setTotalLinesCount(allLines.length);
    setProgressCount(0);

    for (let i = 0; i < allLines.length; i++) {
      const item = allLines[i];
      if (item.type === "vo") {
        await generateVoiceover(item.shotIndex);
      } else if (item.lineIndex !== undefined) {
        await generateLineVoice(item.shotIndex, item.lineIndex);
      }
      setProgressCount(i + 1);
    }

    setIsGeneratingAll(false);
  };

  // Send message to AI Dubbing Director Bot
  const handleSendBotMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botPrompt.trim() || isBotLoading) return;

    const query = botPrompt.trim();
    setBotPrompt("");
    setBotMessages((prev) => [...prev, { role: "user", text: query }]);
    setIsBotLoading(true);

    try {
      const res = await fetch("/api/gemini/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          context: {
            title: project.project_info.title,
            shotsCount: project.shots.length,
            characters: detectedCharacters,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setBotMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
      } else {
        const errMsg = data.details || data.error || "فشل الاتصال بروبوت الذكاء الاصطناعي.";
        const tipMsg = data.tip || "تأكد من وجود GEMINI_API_KEY في ملف .env أو إعدادات السيرفر.";
        setBotMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `⚠️ عذراً: ${errMsg}\n💡 الحل: ${tipMsg}`,
            error: true,
          },
        ]);
      }
    } catch (err: any) {
      setBotMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `⚠️ تعذر الوصول للخدمة: ${err?.message || String(err)}\n💡 تأكد من تشغيل السيرفر ومن وجود مفتاح GEMINI_API_KEY.`,
          error: true,
        },
      ]);
    } finally {
      setIsBotLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Bot Trigger */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-rose-500" />
            <span>محرك الدبلجة المصرية وربط الشخصيات (Edge-TTS V18)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ربط أصوات الشخصيات حسب الجنس والنبرة (بنت ← صوت أنثوي، ولد ← صوت ذكوري بطولي) مع مساعد المخرج الذكي
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Dubbing Director Bot Trigger */}
          <button
            onClick={() => setIsBotOpen(!isBotOpen)}
            className="px-3.5 py-2 text-xs font-semibold text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>{isBotOpen ? "إخفاء مساعد المخرج" : "مساعد المخرج الذكي (Gemini)"}</span>
          </button>

          {/* Batch Generate Button */}
          <button
            onClick={generateAllVoices}
            disabled={isGeneratingAll}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-950 disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>
                  جارِ التوليد ({progressCount}/{totalLinesCount})...
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>توليد جميع الأصوات غير المكتملة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error alert if TTS or network error */}
      {ttsError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{ttsError}</span>
        </div>
      )}

      {/* AI Dubbing Director Bot Interactive Panel */}
      {isBotOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-sky-900/50 space-y-4 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-sky-400" />
              <div>
                <h4 className="text-sm font-bold text-white">مساعد مخرج الدبلجة الذكي (Gemini AI Director)</h4>
                <p className="text-[11px] text-slate-400">
                  اطلب منه تحويل أي سطر إلى إفيه مصري أو تعديل لهجة المشهد لتناسب شخصيات الأنمي
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              gemini-3.8-flash
            </span>
          </div>

          {/* Chat history */}
          <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
            {botMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-rose-950/40 border border-rose-800/50 text-rose-100 mr-8"
                    : msg.error
                    ? "bg-amber-950/40 border border-amber-800 text-amber-200 ml-4 font-mono text-[11px]"
                    : "bg-slate-800/80 border border-slate-700/60 text-slate-100 ml-4"
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 mb-1">
                  {msg.role === "user" ? "أنت:" : "مساعد المخرج (Gemini):"}
                </div>
                {msg.text}
              </div>
            ))}
            {isBotLoading && (
              <div className="p-2.5 rounded-xl bg-slate-800/50 text-slate-300 text-xs flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>مساعد المخرج يفكر ويصيغ الحوار المصري...</span>
              </div>
            )}
          </div>

          {/* Prompt input form */}
          <form onSubmit={handleSendBotMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={botPrompt}
              onChange={(e) => setBotPrompt(e.target.value)}
              placeholder="مثال: حوّل حوار سيف في اللقطة الأولى لأسلوب مصري حماسي مع إفيه خفيف..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isBotLoading || !botPrompt.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال</span>
            </button>
          </form>
        </div>
      )}

      {/* CHARACTER VOICE MAPPING TABLE (CRITICAL FIX #3) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-rose-400" />
              <span>جدول توزيع أصوات الشخصيات (Speaker-to-Voice Mapping)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              حدد لكل ممثل وشخصية صوته المناسب لضمان تمييز الشخصيات الأنثوية عن الذكورية والوحوش
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {detectedCharacters.length} شخصيات مكتشفة بالسيناريو
          </span>
        </div>

        {/* Table of Characters */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">الشخصية</th>
                <th className="py-2.5 px-3">النموذج الصوتي (Edge-TTS)</th>
                <th className="py-2.5 px-3">حدة الصوت (Pitch)</th>
                <th className="py-2.5 px-3">سرعة النطق (Rate)</th>
                <th className="py-2.5 px-3 text-center">معاينة الصوت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {detectedCharacters.map((charName) => {
                const config = getVoiceForCharacter(charName);
                return (
                  <tr key={charName} className="hover:bg-slate-850/50 transition-colors">
                    {/* Character Name */}
                    <td className="py-3 px-3 font-sans font-bold text-white flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-rose-400" />
                      <span>{charName}</span>
                    </td>

                    {/* Voice Model Selector */}
                    <td className="py-3 px-3">
                      <select
                        value={config.voiceId}
                        onChange={(e) => handleUpdateMapping(charName, "voiceId", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-sans"
                      >
                        {AVAILABLE_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Pitch Selector */}
                    <td className="py-3 px-3">
                      <select
                        value={config.pitch}
                        onChange={(e) => handleUpdateMapping(charName, "pitch", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none font-mono"
                      >
                        <option value="+4Hz">+4Hz (نبرة شابة رفيعة)</option>
                        <option value="+2Hz">+2Hz (نبرة طبيعية للبنات)</option>
                        <option value="+0Hz">+0Hz (نبرة متوازنة عادية)</option>
                        <option value="-6Hz">-6Hz (نبرة رجالية غليظة)</option>
                        <option value="-15Hz">-15Hz (نبرة وحوش وعمالقة)</option>
                      </select>
                    </td>

                    {/* Rate Selector */}
                    <td className="py-3 px-3">
                      <select
                        value={config.rate}
                        onChange={(e) => handleUpdateMapping(charName, "rate", e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none font-mono"
                      >
                        <option value="+14%">+14% (حماسي وسريع جداً)</option>
                        <option value="+8%">+8% (سريع مناسب للشورتس)</option>
                        <option value="+0%">+0% (سرعة طبيعية)</option>
                        <option value="-6%">-6% (بطيء درامي متزن)</option>
                      </select>
                    </td>

                    {/* Preview Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => previewVoiceSample(charName)}
                        className="px-2.5 py-1 text-[11px] font-sans font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition cursor-pointer inline-flex items-center gap-1"
                        title="استماع لعينة الصوت"
                      >
                        <Volume2 className="w-3 h-3 text-rose-400" />
                        <span>معاينة</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SHOTS & DIALOGUE LIST */}
      <div className="space-y-4">
        {project.shots.map((shot, shotIdx) => (
          <div
            key={shot.shot_number || shotIdx}
            className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600/30 text-rose-400 border border-rose-500/50 flex items-center justify-center font-mono">
                  {shot.shot_number}
                </span>
                <span>اللقطة {shot.shot_number}</span>
                <span className="text-slate-400 font-normal">
                  ({shot.duration_sec || shot.duration_seconds || 5} ثوانٍ)
                </span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {shot.vocal_cue ? `نبرة المخرج: ${shot.vocal_cue}` : "نبرة عادية"}
              </span>
            </div>

            {/* Voiceover if present */}
            {shot.voiceover_egyptian && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[10px]">
                      صوت الراوي
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      الموديل: {getVoiceForCharacter("الراوي").voiceId}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm font-medium leading-relaxed">
                    &quot;{shot.voiceover_egyptian}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {shot.voiceover_audio_url && (
                    <button
                      onClick={() => playAudio(`vo_${shot.shot_number}`, shot.voiceover_audio_url!)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      title="تشغيل"
                    >
                      {playingAudioId === `vo_${shot.shot_number}` ? (
                        <Pause className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Play className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => generateVoiceover(shotIdx)}
                    disabled={activeGeneratingId === `vo_${shot.shot_number}`}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    {activeGeneratingId === `vo_${shot.shot_number}` ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{shot.voiceover_audio_url ? "إعادة التوليد" : "توليد الصوت"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dialogue lines */}
            {shot.dialogue && shot.dialogue.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-semibold text-slate-300">حوارات الشخصيات في اللقطة:</div>
                {shot.dialogue.map((line, dIdx) => {
                  const lineId = line.id || `shot_${shotIdx + 1}_dlg_${dIdx + 1}`;
                  const charName = line.speaker || line.character || line.character_ar || "سيف";
                  const config = getVoiceForCharacter(charName);

                  return (
                    <div
                      key={dIdx}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {charName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            الصوت: {config.voiceId.replace("ar-EG-", "").replace("Neural", "")} ({config.pitch})
                          </span>
                        </div>
                        <p className="text-slate-100 text-sm font-medium leading-relaxed">
                          &quot;{line.line || line.line_egyptian}&quot;
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {line.audio_url && (
                          <button
                            onClick={() => playAudio(lineId, line.audio_url!)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            {playingAudioId === lineId ? (
                              <Pause className="w-4 h-4 text-rose-400" />
                            ) : (
                              <Play className="w-4 h-4 text-emerald-400" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => generateLineVoice(shotIdx, dIdx)}
                          disabled={activeGeneratingId === lineId}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                        >
                          {activeGeneratingId === lineId ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mic className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>{line.audio_url ? "إعادة التوليد" : "توليد الدبلجة"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
