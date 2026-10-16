export interface ValidationItem {
  type: 'error' | 'warning' | 'info';
  code: string;
  message_ar: string;
  shot_number?: number;
}

export interface ValidationResult {
  is_valid: boolean;
  total_shots: number;
  calculated_total_duration: number;
  errors_count: number;
  warnings_count: number;
  issues: ValidationItem[];
  missing_assets: {
    images: string[];
    vfx: string[];
    sfx: string[];
    music: string[];
  };
}

const VALID_V18_PRESETS = new Set(['narrator', 'tension', 'excited', 'sad', 'beast', 'system']);

/**
 * Converts a string timecode like "00:35" or "01:10" or number into seconds
 */
export function parseTimecodeToSeconds(tc: string | number | undefined | null): number {
  if (tc === undefined || tc === null) return 0;
  if (typeof tc === 'number') return isNaN(tc) ? 0 : tc;
  if (typeof tc !== 'string') return 0;

  const trimmed = tc.trim();
  const parts = trimmed.split(':');
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]);
    const secs = parseFloat(parts[1]);
    return (isNaN(mins) ? 0 : mins * 60) + (isNaN(secs) ? 0 : secs);
  }
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    return (isNaN(hours) ? 0 : hours * 3600) + (isNaN(mins) ? 0 : mins * 60) + (isNaN(secs) ? 0 : secs);
  }
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extracts duration in seconds from timeframe strings like "00:00 - 00:35"
 */
export function parseTimeframeDuration(timeframe: string | undefined | null): number {
  if (!timeframe || typeof timeframe !== 'string') return 0;
  const split = timeframe.split('-');
  if (split.length === 2) {
    const start = parseTimecodeToSeconds(split[0]);
    const end = parseTimecodeToSeconds(split[1]);
    if (end > start) {
      return Math.round((end - start) * 10) / 10;
    }
  }
  return 0;
}

/**
 * Normalizes NotebookLM / v18 JSON output to guarantee compatibility across all pipeline components
 */
export function normalizeNotebookLMProject(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;

  const normalized = JSON.parse(JSON.stringify(raw));

  // 1. Normalize project_info
  if (!normalized.project_info) {
    normalized.project_info = {};
  }
  const pInfo = normalized.project_info;
  pInfo.project_name = pInfo.project_name || pInfo.title || "مشروع دبلجة أنمي";
  pInfo.title = pInfo.title || pInfo.project_name;
  pInfo.anime_title = pInfo.anime_title || pInfo.source_reference || pInfo.title || "أنمي";
  pInfo.default_channel = pInfo.default_channel || "محب أنمي";
  pInfo.target_language = pInfo.target_language || pInfo.language || "العربية المصرية";
  pInfo.aspect_ratio = pInfo.aspect_ratio || "9:16";

  // 2. Normalize shots
  if (Array.isArray(normalized.shots)) {
    pInfo.total_shots = normalized.shots.length;

    normalized.shots = normalized.shots.map((shot: any, sIdx: number) => {
      const shotNum = shot.shot_number ?? (sIdx + 1);

      // Support duration_sec (v18) or duration_seconds or timeframe
      let durationSec = Number(shot.duration_sec ?? shot.duration_seconds);
      if (isNaN(durationSec) || durationSec <= 0) {
        if (shot.timeframe) {
          durationSec = parseTimeframeDuration(shot.timeframe);
        }
      }
      if (isNaN(durationSec) || durationSec <= 0) {
        durationSec = 5.0; // safe fallback
      }

      // Normalize dialogue lines (support dialogue, dialogues, lines, speech, and flexible keys)
      const rawDlgList = Array.isArray(shot.dialogue)
        ? shot.dialogue
        : Array.isArray(shot.dialogues)
        ? shot.dialogues
        : Array.isArray(shot.lines)
        ? shot.lines
        : Array.isArray(shot.speech)
        ? shot.speech
        : [];

      const dialogue = rawDlgList.map((dlg: any, dIdx: number) => {
        const speaker = dlg.speaker || dlg.character_ar || dlg.character || "شخصية";
        const voiceProfile = dlg.voice_profile || dlg.vocal_cue || "narrator";
        const spokenLine = dlg.line || dlg.line_egyptian || dlg.text || dlg.content || dlg.arabic_line || "";

        return {
          id: dlg.id || `shot_${shotNum}_dlg_${dIdx + 1}`,
          character: speaker,
          character_ar: dlg.character_ar || speaker,
          speaker,
          line_original: dlg.line_original || "",
          line_egyptian: spokenLine,
          line: spokenLine,
          voice_model: dlg.voice_model || "ar-EG-ShakirNeural",
          voice_profile: voiceProfile,
          vocal_cue: voiceProfile,
          trigger_sec: parseTimecodeToSeconds(dlg.trigger_sec ?? (dIdx * 2.0)),
          duration_sec: parseTimecodeToSeconds(dlg.duration_sec) || Math.max(2.0, Math.round(((spokenLine).split(/\s+/).length * 0.42) * 10) / 10),
          status: dlg.status || 'pending',
          audio_url: dlg.audio_url || undefined
        };
      });

      // Normalize SFX (support v18 sfx array or legacy sfx_name)
      let sfxList: any[] = [];
      if (shot.sound_design) {
        if (Array.isArray(shot.sound_design.sfx)) {
          sfxList = shot.sound_design.sfx.map((item: any) => ({
            sfx_name: item.sfx_name || "Sub Boom Impact",
            sfx_volume_percent: Number(item.sfx_volume_percent) || 80,
            sfx_trigger_sec: parseTimecodeToSeconds(item.sfx_trigger_sec ?? 0)
          }));
        } else if (shot.sound_design.sfx_name) {
          sfxList = [{
            sfx_name: shot.sound_design.sfx_name,
            sfx_volume_percent: 80,
            sfx_trigger_sec: parseTimecodeToSeconds(shot.sound_design.sfx_trigger_sec ?? 0)
          }];
        }
      }

      // Normalize Beats
      const beats = Array.isArray(shot.beats)
        ? shot.beats.map((b: any) => ({
            at_sec: parseTimecodeToSeconds(b.at_sec ?? 0),
            visual_change: b.visual_change || "تغيير إيقاع بصري"
          }))
        : [];

      // Normalize VFX spatial layers
      const vfx_spatial_layers = Array.isArray(shot.vfx_spatial_layers)
        ? shot.vfx_spatial_layers.map((vfx: any) => ({
            layer_type: vfx.layer_type || "speed_lines",
            trigger_sec: parseTimecodeToSeconds(vfx.trigger_sec || 0),
            duration_sec: parseTimecodeToSeconds(vfx.duration_sec || 2.5),
            position_xy_percent: vfx.position_xy_percent || [50, 50],
            scale: vfx.scale || 1.0
          }))
        : [];

      return {
        ...shot,
        shot_number: shotNum,
        duration_seconds: durationSec,
        duration_sec: durationSec,
        dialogue,
        beats,
        vfx_spatial_layers,
        sound_design: {
          music: shot.sound_design?.music || "موسيقى سينمائية",
          sfx: sfxList,
          sfx_name: sfxList[0]?.sfx_name || shot.sound_design?.sfx_name,
          sfx_trigger_sec: sfxList[0]?.sfx_trigger_sec ?? shot.sound_design?.sfx_trigger_sec ?? 0
        }
      };
    });
  }

  return normalized;
}

export function validateNotebookLMJson(data: any): ValidationResult {
  const issues: ValidationItem[] = [];
  const missing_assets = {
    images: [] as string[],
    vfx: [] as string[],
    sfx: [] as string[],
    music: [] as string[]
  };

  if (!data || typeof data !== "object") {
    return {
      is_valid: false,
      total_shots: 0,
      calculated_total_duration: 0,
      errors_count: 1,
      warnings_count: 0,
      issues: [{
        type: 'error',
        code: 'INVALID_JSON_OBJECT',
        message_ar: 'الملف المدخل ليس كائن JSON صالح.'
      }],
      missing_assets
    };
  }

  // 1. Check project_info (accepts project_name OR title)
  if (!data.project_info) {
    issues.push({
      type: 'error',
      code: 'MISSING_PROJECT_INFO',
      message_ar: 'عنصر project_info مفقود من ملف JSON.'
    });
  } else {
    if (!data.project_info.project_name && !data.project_info.title) {
      issues.push({
        type: 'warning',
        code: 'MISSING_PROJECT_NAME',
        message_ar: 'اسم المشروع أو العنوان غير محدد في project_info.'
      });
    }
  }

  // 2. Check character_bible (v18)
  const validCharacterIds = new Set<string>();
  if (Array.isArray(data.character_bible)) {
    data.character_bible.forEach((char: any) => {
      if (char.id) validCharacterIds.add(char.id);
    });
  }

  // 3. Check shots array
  if (!Array.isArray(data.shots) || data.shots.length === 0) {
    issues.push({
      type: 'error',
      code: 'EMPTY_SHOTS_ARRAY',
      message_ar: 'قائمة اللقطات shots فارغة أو ليست مصفوفة.'
    });
    return {
      is_valid: false,
      total_shots: 0,
      calculated_total_duration: 0,
      errors_count: issues.filter(i => i.type === 'error').length,
      warnings_count: issues.filter(i => i.type === 'warning').length,
      issues,
      missing_assets
    };
  }

  let calculated_total_duration = 0;
  const seenShotNumbers = new Set<number>();

  data.shots.forEach((shot: any, index: number) => {
    const shotNum = shot.shot_number ?? (index + 1);

    // Unique shot number check
    if (seenShotNumbers.has(shotNum)) {
      issues.push({
        type: 'error',
        code: 'DUPLICATE_SHOT_NUMBER',
        shot_number: shotNum,
        message_ar: `رقم اللقطة ${shotNum} مكرر في الملف.`
      });
    }
    seenShotNumbers.add(shotNum);

    // Flexible Duration check: duration_sec or duration_seconds or timeframe
    let duration = Number(shot.duration_sec ?? shot.duration_seconds);
    if (isNaN(duration) || duration <= 0) {
      if (shot.timeframe) {
        duration = parseTimeframeDuration(shot.timeframe);
      }
    }

    if (isNaN(duration) || duration <= 0) {
      issues.push({
        type: 'error',
        code: 'INVALID_SHOT_DURATION',
        shot_number: shotNum,
        message_ar: `تعذر حساب مدة اللقطة ${shotNum}. يرجى توفير duration_sec أو timeframe.`
      });
    } else {
      calculated_total_duration += duration;
    }

    // Shot 1 Hook check (v18 specification)
    if (shotNum === 1) {
      const hasSubBoom = Array.isArray(shot.sound_design?.sfx)
        ? shot.sound_design.sfx.some((s: any) => (s.sfx_name || '').toLowerCase().includes('sub') || (s.sfx_name || '').toLowerCase().includes('boom'))
        : (shot.sound_design?.sfx_name || '').toLowerCase().includes('boom') || (shot.sound_design?.sfx_name || '').toLowerCase().includes('sub');

      if (!hasSubBoom) {
        issues.push({
          type: 'info',
          code: 'V18_HOOK_SFX_RECOMMENDED',
          shot_number: 1,
          message_ar: 'توصية v18: يفضل بدء الشوت الأول بمؤثر Sub Boom Impact عند 0.0 ثانية لرفع نسبة الاحتفاظ بالمشاهد.'
        });
      }
    }

    // Characters in shot validation vs character_bible
    if (Array.isArray(shot.characters_in_shot) && validCharacterIds.size > 0) {
      shot.characters_in_shot.forEach((charId: string) => {
        if (!validCharacterIds.has(charId)) {
          issues.push({
            type: 'warning',
            code: 'UNKNOWN_CHARACTER_ID',
            shot_number: shotNum,
            message_ar: `معرف الشخصية "${charId}" في اللقطة ${shotNum} غير مسجل في character_bible.`
          });
        }
      });
    }

    // Voiceover cleanliness check (v18 rule: no dashes or brackets inside spoken voiceover)
    if (typeof shot.voiceover_egyptian === 'string') {
      const vo = shot.voiceover_egyptian;
      if (vo.includes('--') || vo.includes('—') || (vo.includes('-') && !/\d+-\d+/.test(vo))) {
        issues.push({
          type: 'warning',
          code: 'DASH_IN_VOICEOVER',
          shot_number: shotNum,
          message_ar: `اللقطة ${shotNum}: تم رصد شرطات في التعليق الصوتي، يفضل استبدالها بفاصلة عادية لمنع توقف Edge-TTS.`
        });
      }
      if (/[\[\]\(\)\{\}]/.test(vo)) {
        issues.push({
          type: 'warning',
          code: 'BRACKET_IN_VOICEOVER',
          shot_number: shotNum,
          message_ar: `اللقطة ${shotNum}: تم رصد أقواس أو توجيهات إخراجية في التعليق الصوتي، يجب أن يكون النص صافيًا 100%.`
        });
      }
    }

    // Vocal cue validation
    if (shot.vocal_cue && typeof shot.vocal_cue === 'string') {
      const cue = shot.vocal_cue.toLowerCase().trim();
      if (!VALID_V18_PRESETS.has(cue) && !cue.includes('(')) {
        issues.push({
          type: 'info',
          code: 'CUSTOM_VOCAL_CUE',
          shot_number: shotNum,
          message_ar: `اللقطة ${shotNum}: النبرة "${shot.vocal_cue}" مخصصة. قوالب v18 القياسية هي: narrator, tension, excited, sad, beast, system.`
        });
      }
    }

    // Images check
    if (!shot.image_filename) {
      issues.push({
        type: 'info',
        code: 'MISSING_IMAGE_ASSET',
        shot_number: shotNum,
        message_ar: `اللقطة ${shotNum} لا تحتوي على صورة محددة image_filename (سيتم استخدام المعاينة التوليدية).`
      });
      missing_assets.images.push(`shot_${shotNum}_preview`);
    }

    // Dialogue & Voiceover check
    const hasVO = typeof shot.voiceover_egyptian === 'string' && shot.voiceover_egyptian.trim().length > 0;
    const hasDialogue = Array.isArray(shot.dialogue) && shot.dialogue.length > 0;

    if (!hasVO && !hasDialogue) {
      issues.push({
        type: 'warning',
        code: 'NO_SPEECH_IN_SHOT',
        shot_number: shotNum,
        message_ar: `اللقطة ${shotNum} لا تحتوي على تعليق صوتي مصري أو حوار.`
      });
    }

    // Dialogue details check
    if (Array.isArray(shot.dialogue)) {
      shot.dialogue.forEach((dlg: any, dIdx: number) => {
        const spoken = dlg.line || dlg.line_egyptian;
        if (!spoken || typeof spoken !== 'string') {
          issues.push({
            type: 'error',
            code: 'MISSING_EGYPTIAN_LINE',
            shot_number: shotNum,
            message_ar: `السطر المصري مفقود للحوار رقم ${dIdx + 1} في اللقطة ${shotNum}.`
          });
        }
      });
    }

    // VFX check
    if (Array.isArray(shot.vfx_spatial_layers)) {
      shot.vfx_spatial_layers.forEach((vfx: any) => {
        if (vfx.layer_type) {
          missing_assets.vfx.push(vfx.layer_type);
        }
      });
    }

    // Sound Design check (Array or object)
    if (shot.sound_design) {
      if (Array.isArray(shot.sound_design.sfx)) {
        shot.sound_design.sfx.forEach((s: any) => {
          if (s.sfx_name) missing_assets.sfx.push(s.sfx_name);
        });
      } else if (shot.sound_design.sfx_name) {
        missing_assets.sfx.push(shot.sound_design.sfx_name);
      }
      if (shot.sound_design.music) {
        missing_assets.music.push(shot.sound_design.music);
      }
    }
  });

  const errors_count = issues.filter(i => i.type === 'error').length;
  const warnings_count = issues.filter(i => i.type === 'warning').length;

  return {
    is_valid: errors_count === 0,
    total_shots: data.shots.length,
    calculated_total_duration: Math.round(calculated_total_duration * 100) / 100,
    errors_count,
    warnings_count,
    issues,
    missing_assets: {
      images: Array.from(new Set(missing_assets.images)),
      vfx: Array.from(new Set(missing_assets.vfx)),
      sfx: Array.from(new Set(missing_assets.sfx)),
      music: Array.from(new Set(missing_assets.music))
    }
  };
}

export { extractAndParseResilientJson } from './resilient-json-parser';
export type { ResilientJsonResult } from './resilient-json-parser';

