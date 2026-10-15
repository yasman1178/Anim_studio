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

/**
 * Converts a string timecode like "00:35" or "01:10" or "01:50:30" or number into seconds
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
 * Extracts duration in seconds from timeframe strings like "00:00 - 00:35" or "01:10 - 01:50"
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
 * Normalizes NotebookLM JSON output to guarantee compatibility with all pipeline components
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
  pInfo.anime_title = pInfo.anime_title || pInfo.source_reference || pInfo.title || "أنمي";
  pInfo.default_channel = pInfo.default_channel || "محب أنمي";
  pInfo.target_language = pInfo.target_language || pInfo.language || "العربية المصرية";
  pInfo.aspect_ratio = pInfo.aspect_ratio || "16:9";

  // 2. Normalize shots
  if (Array.isArray(normalized.shots)) {
    pInfo.total_shots = normalized.shots.length;

    normalized.shots = normalized.shots.map((shot: any, sIdx: number) => {
      const shotNum = shot.shot_number ?? (sIdx + 1);

      // Derive duration_seconds from timeframe if missing
      let durationSec = Number(shot.duration_seconds);
      if (isNaN(durationSec) || durationSec <= 0) {
        if (shot.timeframe) {
          durationSec = parseTimeframeDuration(shot.timeframe);
        }
      }
      if (isNaN(durationSec) || durationSec <= 0) {
        durationSec = 5.0; // safe fallback
      }

      // Normalize dialogue lines
      const dialogue = Array.isArray(shot.dialogue)
        ? shot.dialogue.map((dlg: any, dIdx: number) => {
            const charKey = dlg.character || dlg.speaker || "شخصية";
            const voiceConfig = normalized.character_voice_mapping?.[charKey];
            const voiceModel = dlg.voice_model || voiceConfig?.voice_model || "ar-EG-ShakirNeural";

            return {
              id: dlg.id || `shot_${shotNum}_dlg_${dIdx + 1}`,
              character: charKey,
              character_ar: dlg.character_ar || charKey,
              line_original: dlg.line_original || "",
              line_egyptian: dlg.line_egyptian || "",
              voice_model: voiceModel,
              vocal_cue: dlg.vocal_cue || shot.vocal_cue || "",
              trigger_sec: parseTimecodeToSeconds(dlg.trigger_sec ?? (dIdx * 2.0)),
              duration_sec: parseTimecodeToSeconds(dlg.duration_sec) || Math.max(2.0, Math.round(((dlg.line_egyptian || "").split(/\s+/).length * 0.4) * 10) / 10),
              status: dlg.status || 'done'
            };
          })
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
        dialogue,
        vfx_spatial_layers
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

  // 2. Check character_voice_mapping
  if (!data.character_voice_mapping || typeof data.character_voice_mapping !== 'object') {
    issues.push({
      type: 'warning',
      code: 'MISSING_VOICE_MAPPING',
      message_ar: 'جدول أصوات الشخصيات character_voice_mapping مفقود أو غير معرف.'
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

    // Flexible Duration check: check shot.duration_seconds OR calculate from timeframe!
    let duration = Number(shot.duration_seconds);
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
        message_ar: `تعذر حساب مدة اللقطة ${shotNum}. يرجى توفير duration_seconds أو timeframe صحيح (مثال: 00:00 - 00:35).`
      });
    } else {
      calculated_total_duration += duration;
    }

    // Timeframe format validation
    if (!shot.timeframe || typeof shot.timeframe !== 'string') {
      issues.push({
        type: 'warning',
        code: 'MISSING_TIMEFRAME',
        shot_number: shotNum,
        message_ar: `النطاق الزمني timeframe غير محدد للقطة ${shotNum}.`
      });
    }

    // Images check
    if (!shot.image_filename) {
      issues.push({
        type: 'info',
        code: 'MISSING_IMAGE_ASSET',
        shot_number: shotNum,
        message_ar: `اللقطة ${shotNum} لا تحتوي على ملف صورة محدد image_filename (سيتم استخدام المعاينة التوليدية).`
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
        if (!dlg.line_egyptian || typeof dlg.line_egyptian !== 'string') {
          issues.push({
            type: 'error',
            code: 'MISSING_EGYPTIAN_LINE',
            shot_number: shotNum,
            message_ar: `السطر المصري line_egyptian مفقود للحوار رقم ${dIdx + 1} في اللقطة ${shotNum}.`
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

    // Sound Design check
    if (shot.sound_design) {
      if (shot.sound_design.sfx_name) {
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
