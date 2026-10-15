export interface DialogueLine {
  id?: string;
  character?: string;
  character_ar?: string;
  speaker?: string;
  line_original?: string;
  line_egyptian?: string;
  line?: string;
  voice_model?: string;
  voice_profile?: string;
  vocal_cue?: string;
  trigger_sec?: number;
  duration_sec?: number;
  audio_url?: string;
  status?: 'pending' | 'generating' | 'done' | 'failed';
}

export interface VfxLayer {
  layer_type: string;
  trigger_sec: number;
  duration_sec: number;
  position_xy_percent?: [number, number];
  scale?: number;
  custom_file?: string;
}

export interface SfxItem {
  sfx_name: string;
  sfx_volume_percent?: number;
  sfx_trigger_sec?: number;
}

export interface Beat {
  at_sec: number;
  visual_change: string;
}

export interface Shot {
  shot_number: number;
  timeframe?: string;
  duration_seconds: number;
  duration_sec?: number;
  type?: 'Hook' | 'Story' | 'Climax' | 'Action' | 'Ending' | string;
  mood?: string;
  vocal_cue?: 'narrator' | 'tension' | 'excited' | 'sad' | 'beast' | 'system' | string;
  image_filename?: string;
  image_prompt_en?: string;
  characters_in_shot?: string[];
  camera_motion?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'shake' | 'static' | string;
  transition_out?: 'cut' | 'flash' | 'glitch' | 'fade' | 'whip' | string;
  voiceover_egyptian?: string;
  dialogue: DialogueLine[];
  beats?: Beat[];
  vfx_spatial_layers?: VfxLayer[];
  sound_design?: {
    music?: string;
    sfx?: SfxItem[];
    sfx_name?: string;
    sfx_trigger_sec?: number;
  };
  text_overlay?: string;
}

export interface CharacterVoiceMapping {
  voice_name: string;
  character_ar: string;
  gender: 'male' | 'female';
  pitch: string;
  rate: string;
}

export interface CharacterBibleEntry {
  id: string;
  name: string;
  description_en: string;
  reference_image?: string;
}

export interface SeriesMeta {
  series_name: string;
  episode_number: number;
  chapters_covered: number[];
  next_episode_teaser: string;
}

export interface SeoBlock {
  title_options: string[];
  description: string;
  hashtags: string[];
  thumbnail_prompt_en?: string;
  pinned_comment?: string;
}

export interface NotebookLMProject {
  project_info: {
    project_name?: string;
    title?: string;
    anime_title?: string;
    episode?: number;
    total_shots: number;
    default_channel?: string;
    target_language?: string;
    language?: string;
    aspect_ratio: '16:9' | '9:16';
    platform?: string;
    source_url?: string;
    estimated_duration_sec?: number;
  };
  series_meta?: SeriesMeta;
  global_style_en?: string;
  negative_prompt_en?: string;
  character_bible?: CharacterBibleEntry[];
  character_voice_mapping?: Record<string, CharacterVoiceMapping>;
  shots: Shot[];
  seo?: SeoBlock;
}

// -------------------------------------------------------------
// V18 FLAGSHIP PROJECT: حكاية سيف (سلسلة دبلجة الشورتس 9:16)
// -------------------------------------------------------------
export const SAMPLE_PROJECT_SEIF_V18: NotebookLMProject = {
  project_info: {
    title: "حكاية سيف - أضعف صياد في المعبد المهجور",
    project_name: "حكاية سيف - الحلقة 4",
    anime_title: "حكاية سيف (سولو ليفلينج)",
    episode: 4,
    total_shots: 3,
    platform: "YouTube Shorts / Reels / TikTok",
    aspect_ratio: "9:16",
    estimated_duration_sec: 17,
    default_channel: "محب أنمي",
    target_language: "العربية المصرية (Edge-TTS Pure Text)",
    language: "Egyptian Arabic (Edge-TTS Pure Text)"
  },
  series_meta: {
    series_name: "حكاية سيف",
    episode_number: 4,
    chapters_covered: [8, 9],
    next_episode_teaser: "هل هيقدر سيف يهرب من غضب تمثال الصرح في اللحظة الأخيرة؟"
  },
  global_style_en: "Dark fantasy manhwa style, vertical 9:16, cinematic neon chiaroscuro lighting, glowing cyan magic runes, no text in image",
  negative_prompt_en: "text, watermark, logo, extra fingers, deformed hands, blurry, low quality, cropped face",
  character_bible: [
    {
      id: "seif",
      name: "سيف",
      description_en: "20yo Egyptian hunter, short messy black hair, dark navy zip-up hoodie (#1B2A4A) over dark gray t-shirt, jeans, white bandage on left cheek, iron dagger with dark purple shadow energy wisps",
      reference_image: "refs/seif_front.png"
    },
    {
      id: "sara",
      name: "سارة",
      description_en: "Talented healer hunter, bob haircut, warm expressive eyes, protective rune robes",
      reference_image: "refs/sara_front.png"
    }
  ],
  character_voice_mapping: {
    seif: {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "سيف",
      gender: "male",
      pitch: "+0Hz",
      rate: "+8%"
    },
    sara: {
      voice_name: "ar-EG-SalmaNeural",
      character_ar: "سارة",
      gender: "female",
      pitch: "+2Hz",
      rate: "+4%"
    }
  },
  shots: [
    {
      shot_number: 1,
      duration_seconds: 5.0,
      duration_sec: 5.0,
      type: "Hook",
      mood: "غموض وتحدي سينمائي",
      vocal_cue: "excited",
      text_overlay: "أضعف صياد في المتاهة!",
      image_filename: "shot_01_ch89_v18.png",
      characters_in_shot: ["seif"],
      image_prompt_en: "Dramatic close-up of {seif} gripping the glowing dagger, shocked wide eyes, dark dungeon background with floating cyan runes",
      camera_motion: "zoom_in",
      transition_out: "flash",
      voiceover_egyptian: "أضعف صياد في الدنيا, ودخل المتاهة اللي مفيش حد رجع منها!",
      dialogue: [],
      beats: [
        { at_sec: 0.0, visual_change: "close-up صدمة مع flash" },
        { at_sec: 2.8, visual_change: "زووم على الخنجر وتوهج الهالة" }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "dark_purple_shadow_aura",
          position_xy_percent: [50, 60],
          scale: 1.2,
          trigger_sec: 1.0,
          duration_sec: 3.5
        }
      ],
      sound_design: {
        music: "موسيقى سينمائية سريعة متصاعدة (Action Thrill BPM 140)",
        sfx: [
          { sfx_name: "Sub Boom Impact", sfx_volume_percent: 90, sfx_trigger_sec: 0.0 },
          { sfx_name: "Giant Monster Roar", sfx_volume_percent: 70, sfx_trigger_sec: 2.5 }
        ]
      }
    },
    {
      shot_number: 2,
      duration_seconds: 6.0,
      duration_sec: 6.0,
      type: "Story",
      mood: "صعبانيات وشجن",
      vocal_cue: "sad",
      text_overlay: "علاج أمه",
      image_filename: "shot_02_ch89_v18.png",
      characters_in_shot: ["seif"],
      image_prompt_en: "{seif} standing alone in a dim hospital corridor, tired eyes, cold blue light, faint purple shadow at his feet",
      camera_motion: "pan_right",
      transition_out: "fade",
      voiceover_egyptian: "السبب مش القوة. أمه في المستشفى, وكل يوم بيعدي بيكلفه أكتر من اللي معاه.",
      dialogue: [
        {
          speaker: "سيف",
          voice_profile: "sad",
          line: "لازم أرجع, مفيش قدامي غير كده.",
          voice_model: "ar-EG-ShakirNeural",
          trigger_sec: 2.0,
          duration_sec: 3.0
        }
      ],
      beats: [
        { at_sec: 0.0, visual_change: "لقطة واسعة للممر" },
        { at_sec: 3.0, visual_change: "قص على وجه سيف" }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "blue_aura",
          position_xy_percent: [50, 70],
          scale: 1.0,
          trigger_sec: 0.5,
          duration_sec: 5.0
        }
      ],
      sound_design: {
        music: "بيانو حزين هادئ",
        sfx: [
          { sfx_name: "Heartbeat Slow", sfx_volume_percent: 50, sfx_trigger_sec: 1.0 },
          { sfx_name: "Swoosh Fast Whip", sfx_volume_percent: 60, sfx_trigger_sec: 5.2 }
        ]
      }
    },
    {
      shot_number: 3,
      duration_seconds: 6.0,
      duration_sec: 6.0,
      type: "Climax",
      mood: "تحدي وقوة النظام",
      vocal_cue: "tension",
      text_overlay: "نافذة الاستيقاظ الزرقاء!",
      image_filename: "shot_03_ch89_v18.png",
      characters_in_shot: ["seif"],
      image_prompt_en: "{seif} looking up in dark chamber with glowing neon blue floating interface system log",
      camera_motion: "shake",
      transition_out: "whip",
      voiceover_egyptian: "وفجأة, الصرح اتهز كله ونافذة سحرية ظهرت قدامه بتقوله: جه الوقت تصحى!",
      dialogue: [
        {
          speaker: "النظام",
          voice_profile: "system",
          line: "تم قبولك كلاعب رسمي في الصرح.",
          voice_model: "ar-AE-HamdanNeural",
          trigger_sec: 2.2,
          duration_sec: 2.8
        }
      ],
      beats: [
        { at_sec: 0.0, visual_change: "اهتزاز الشاشة مع وميض أزرق" },
        { at_sec: 2.8, visual_change: "ظهور نافذة النظام العائمة" }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "speed_lines",
          position_xy_percent: [50, 50],
          scale: 1.2,
          trigger_sec: 0.2,
          duration_sec: 5.5
        }
      ],
      sound_design: {
        music: "موسيقى حماسية وإثارة تصاعدية",
        sfx: [
          { sfx_name: "Dark Shadow Energy Aura", sfx_volume_percent: 75, sfx_trigger_sec: 0.5 },
          { sfx_name: "Glitch System Shock", sfx_volume_percent: 85, sfx_trigger_sec: 2.0 }
        ]
      }
    }
  ],
  seo: {
    title_options: [
      "كيف نجا أضعف صياد من لعنة المعبد؟! | حكاية سيف #4",
      "السر القاتل داخل معبد الموت! حكاية سيف 4 بالمصري",
      "هيدخل المتاهة عشان أمه... وهو الأضعف! قصة سيف"
    ],
    description: "أضعف صياد يدخل المتاهة الملعونة لعلاج أمه المريضة، ليواجه رعب تماثيل الصرح وينال فرصة استيقاظ استثنائية! تابع حكاية سيف الأسبوعية على قناة محب أنمي.",
    hashtags: ["#حكاية_سيف", "#أنمي", "#شورتس", "#محب_أنمي", "#دبلجة_مصرية"],
    thumbnail_prompt_en: "Extreme close-up of {seif} with shocked glowing eyes, cyan vs red neon contrast, purple shadow background, no text",
    pinned_comment: "تتوقعوا سيف هيقدر يهزم حارس الصرح في الحلقة الجاية ولا هيضطر يهرب؟ شاركونا رأيكم في التعليقات! 👇🔥"
  }
};

// Aliased as default sample project for seamless integration
export const SAMPLE_PROJECT_SOLO_LEVELING = SAMPLE_PROJECT_SEIF_V18;


export const SAMPLE_PROJECT_JUJUTSU: NotebookLMProject = {
  project_info: {
    project_name: "ملخص قتال غوجو وسوكونا - جوجوتسو كايسن",
    anime_title: "Jujutsu Kaisen (جوجوتسو كايسن)",
    episode: 23,
    total_shots: 2,
    default_channel: "محب أنمي",
    target_language: "العربية المصرية",
    aspect_ratio: "16:9",
    source_url: ""
  },
  character_voice_mapping: {
    narrator: {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "الراوي",
      gender: "male",
      pitch: "+0Hz",
      rate: "+0%"
    },
    gojo_satoru: {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "غوجو ساتورو",
      gender: "male",
      pitch: "+4Hz",
      rate: "+5%"
    }
  },
  shots: [
    {
      shot_number: 1,
      duration_seconds: 5.0,
      duration_sec: 5.0,
      image_filename: "gojo_shot_01.jpg",
      voiceover_egyptian: "أقوى مستعمل جوجوتسو في العالم بيفتح مجاله اللا نهائي.. والمشهد بيتحول لعظمة!",
      dialogue: [
        {
          character: "gojo_satoru",
          character_ar: "غوجو ساتورو",
          line_egyptian: "توسع المجال.. الفراغ اللانهائي!",
          voice_model: "ar-EG-ShakirNeural",
          trigger_sec: 1.0,
          duration_sec: 3.5
        }
      ],
      sound_design: {
        music: "jujutsu_epic_battle",
        sfx_name: "Sub Boom Impact",
        sfx: [{ sfx_name: "Sub Boom Impact", sfx_trigger_sec: 0.0, sfx_volume_percent: 90 }]
      }
    },
    {
      shot_number: 2,
      duration_seconds: 6.0,
      duration_sec: 6.0,
      image_filename: "gojo_shot_02.jpg",
      voiceover_egyptian: "سوكونا بيبتسم ابتسامة شيطانية، والكل عارف إن اللحظة دي مفيهاش تراجع!",
      dialogue: [],
      sound_design: {
        music: "tension_beat",
        sfx: [{ sfx_name: "Giant Monster Roar", sfx_trigger_sec: 1.0, sfx_volume_percent: 80 }]
      }
    }
  ]
};

export const SAMPLE_PROJECT_SOLO_LEVELING_SEASON_3: NotebookLMProject = SAMPLE_PROJECT_SEIF_V18;
