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

  // 1. Check project_info
  if (!data.project_info) {
    issues.push({
      type: 'error',
      code: 'MISSING_PROJECT_INFO',
      message_ar: 'عنصر project_info مفقود من ملف JSON.'
    });
  } else {
    if (!data.project_info.project_name) {
      issues.push({
        type: 'warning',
        code: 'MISSING_PROJECT_NAME',
        message_ar: 'اسم المشروع غير محدد في project_info.'
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

  const declaredTotalShots = data.project_info?.total_shots;
  if (typeof declaredTotalShots === 'number' && declaredTotalShots !== data.shots.length) {
    issues.push({
      type: 'warning',
      code: 'SHOTS_COUNT_MISMATCH',
      message_ar: `عدد اللقطات الفعلي (${data.shots.length}) لا يطابق العدد المعلن في project_info.total_shots (${declaredTotalShots}).`
    });
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

    // Duration check
    const duration = Number(shot.duration_seconds);
    if (isNaN(duration) || duration <= 0) {
      issues.push({
        type: 'error',
        code: 'INVALID_SHOT_DURATION',
        shot_number: shotNum,
        message_ar: `مدة اللقطة ${shotNum} غير صالحة أو أقل من صفر.`
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
        if (typeof dlg.trigger_sec === 'number' && typeof shot.duration_seconds === 'number') {
          if (dlg.trigger_sec > shot.duration_seconds) {
            issues.push({
              type: 'warning',
              code: 'DIALOGUE_TRIGGER_EXCEEDS_SHOT',
              shot_number: shotNum,
              message_ar: `بداية الحوار (${dlg.trigger_sec}s) تتجاوز مدة اللقطة (${shot.duration_seconds}s).`
            });
          }
        }
      });
    }

    // VFX check
    if (Array.isArray(shot.vfx_spatial_layers)) {
      shot.vfx_spatial_layers.forEach((vfx: any) => {
        if (vfx.trigger_sec > (shot.duration_seconds || 10)) {
          issues.push({
            type: 'warning',
            code: 'VFX_TRIGGER_OUT_OF_BOUNDS',
            shot_number: shotNum,
            message_ar: `تأثير ${vfx.layer_type} يبدأ عند ${vfx.trigger_sec}s وهو أكبر من مدة اللقطة.`
          });
        }
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
