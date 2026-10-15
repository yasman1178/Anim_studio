export interface DialogueLine {
  id: string;
  character: string;
  character_ar: string;
  line_original: string;
  line_egyptian: string;
  voice_model: string;
  vocal_cue?: string;
  trigger_sec: number;
  duration_sec: number;
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

export interface Shot {
  shot_number: number;
  timeframe: string;
  duration_seconds: number;
  image_filename?: string;
  image_prompt_en?: string;
  voiceover_egyptian?: string;
  dialogue: DialogueLine[];
  vfx_spatial_layers?: VfxLayer[];
  sound_design?: {
    music?: string;
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

export interface NotebookLMProject {
  project_info: {
    project_name: string;
    anime_title: string;
    episode: number;
    total_shots: number;
    default_channel: string;
    target_language: string;
    aspect_ratio: '16:9' | '9:16';
    source_url?: string;
  };
  character_voice_mapping: Record<string, CharacterVoiceMapping>;
  shots: Shot[];
}

export const SAMPLE_PROJECT_SOLO_LEVELING: NotebookLMProject = {
  project_info: {
    project_name: "ملخص دبلجة سولو ليفلينج - الحلقة 1",
    anime_title: "Solo Leveling (سولو ليفلينج)",
    episode: 1,
    total_shots: 3,
    default_channel: "محب أنمي",
    target_language: "العربية المصرية",
    aspect_ratio: "16:9",
    source_url: "https://www.youtube.com/watch?v=sample-solo-leveling"
  },
  character_voice_mapping: {
    narrator: {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "الراوي",
      gender: "male",
      pitch: "-2Hz",
      rate: "+0%"
    },
    sung_jinwoo: {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "سونغ جين وو",
      gender: "male",
      pitch: "+4Hz",
      rate: "+5%"
    },
    cha_haein: {
      voice_name: "ar-EG-SalmaNeural",
      character_ar: "تشا هاي إن",
      gender: "female",
      pitch: "+2Hz",
      rate: "+0%"
    }
  },
  shots: [
    {
      shot_number: 1,
      timeframe: "00:00 - 00:05",
      duration_seconds: 5.0,
      image_filename: "solo_shot_01.jpg",
      image_prompt_en: "Dark dungeon entrance with glowing blue runes and crumbling stones",
      voiceover_egyptian: "في اللحظة دي، الكل كان فاكر إن البوابة مجرد مهمة سهلة.. بس اللي مستنيهم جوة كان كابوس حقيقي!",
      dialogue: [
        {
          id: "shot_1_dlg_1",
          character: "sung_jinwoo",
          character_ar: "سونغ جين وو",
          line_original: "Something feels wrong about this gate...",
          line_egyptian: "في حاجة مش مريحة في البوابة دي.. حاسس إننا داخلين فخ!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "(صوت قلق ومرتبك)",
          trigger_sec: 1.5,
          duration_sec: 3.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "blue_aura",
          trigger_sec: 1.0,
          duration_sec: 3.5,
          position_xy_percent: [50, 50],
          scale: 1.2
        },
        {
          layer_type: "camera_shake",
          trigger_sec: 2.2,
          duration_sec: 0.8
        }
      ],
      sound_design: {
        music: "ominous_dungeon_theme",
        sfx_name: "energy_pulse",
        sfx_trigger_sec: 1.0
      },
      text_overlay: "البوابة المزدوجة — زنزانة الرعب"
    },
    {
      shot_number: 2,
      timeframe: "00:05 - 00:11",
      duration_seconds: 6.0,
      image_filename: "solo_shot_02.jpg",
      image_prompt_en: "Massive glowing red eyes of the stone god statue inside the temple",
      voiceover_egyptian: "وفجأة.. التماثيل الحجرية قفلت الأبواب، وعيون تمثال الإله بدأت تنور بالأحمر المرعب!",
      dialogue: [
        {
          id: "shot_2_dlg_1",
          character: "cha_haein",
          character_ar: "تشا هاي إن",
          line_original: "Jinwoo! Don't move! The statue is looking right at you!",
          line_egyptian: "جين وو! أوعى تتحرك من مكانك! التمثال باصص في عينك مباشرة!",
          voice_model: "ar-EG-SalmaNeural",
          vocal_cue: "(صوت صراخ وتحذير)",
          trigger_sec: 1.0,
          duration_sec: 3.5,
          status: 'done'
        },
        {
          id: "shot_2_dlg_2",
          character: "sung_jinwoo",
          character_ar: "سونغ جين وو",
          line_original: "I need to analyze its pattern right now!",
          line_egyptian: "لازم أركز وأفهم حركته حالاً.. لو حد فينا اتحرك هنموت كلنا!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "(صوت لاهث ومصمم)",
          trigger_sec: 4.2,
          duration_sec: 1.8,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "red_eye_glow",
          trigger_sec: 0.8,
          duration_sec: 4.0,
          position_xy_percent: [50, 35],
          scale: 1.4
        },
        {
          layer_type: "impact_flash",
          trigger_sec: 3.5,
          duration_sec: 0.4
        }
      ],
      sound_design: {
        music: "dramatic_statue_chorus",
        sfx_name: "heavy_impact",
        sfx_trigger_sec: 3.5
      },
      text_overlay: "الوصية الأولى: اخضع للإله!"
    },
    {
      shot_number: 3,
      timeframe: "00:11 - 00:16",
      duration_seconds: 5.0,
      image_filename: "solo_shot_03.jpg",
      image_prompt_en: "Sung Jinwoo looking up with blue glowing system notification window",
      voiceover_egyptian: "وهنا بدأت المعجزة، نافذة زرقاء غامضة تظهر قدامه.. واختيار واحد: إما الموت أو النهوض!",
      dialogue: [
        {
          id: "shot_3_dlg_1",
          character: "sung_jinwoo",
          character_ar: "سونغ جين وو",
          line_original: "A player? What does this system mean?!",
          line_egyptian: "لاعب؟! يعني إيه النظام ده.. أنا هرجع أقوى من أي حد!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "(صوت دهشة ممزوجة بالقوة)",
          trigger_sec: 1.2,
          duration_sec: 3.2,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "speed_lines",
          trigger_sec: 0.5,
          duration_sec: 3.5,
          position_xy_percent: [50, 50],
          scale: 1.0
        },
        {
          layer_type: "electric_spark",
          trigger_sec: 2.0,
          duration_sec: 2.0
        }
      ],
      sound_design: {
        music: "heroic_awakening_beat",
        sfx_name: "energy_charge",
        sfx_trigger_sec: 0.5
      },
      text_overlay: "تهانينا.. لقد أصبحت 'اللاعب'!"
    }
  ]
};

export const SAMPLE_PROJECT_JUJUTSU: NotebookLMProject = {
  project_info: {
    project_name: "ملخص قتال غوجو وسوكونا - جوجوتسو كايسن",
    anime_title: "Jujutsu Kaisen (جوجوتسو كايسن)",
    episode: 23,
    total_shots: 2,
    default_channel: "محب أنمي",
    target_language: "العربية المصرية",
    aspect_ratio: "16:9",
    source_url: "https://www.youtube.com/watch?v=sample-gojo-sukuna"
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
      pitch: "+3Hz",
      rate: "+8%"
    },
    sukuna: {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "ريومن سوكونا",
      gender: "male",
      pitch: "-6Hz",
      rate: "-5%"
    }
  },
  shots: [
    {
      shot_number: 1,
      timeframe: "00:00 - 00:06",
      duration_seconds: 6.0,
      image_filename: "jjk_shot_01.jpg",
      image_prompt_en: "Gojo Satoru lowering his blindfold with brilliant glowing blue Six Eyes",
      voiceover_egyptian: "أقوى ساحر في العالم بيرفع عصابته، والكل عارف إن اللحظة دي معناها دمار شامل!",
      dialogue: [
        {
          id: "jjk_1_dlg_1",
          character: "gojo_satoru",
          character_ar: "غوجو ساتورو",
          line_original: "Don't worry, I'm the strongest after all.",
          line_egyptian: "متشيلش هم خالص يا صاحبي.. متنساش إني أنا الأقوى هنا!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "(ابتسامة ثقة واستهزاء)",
          trigger_sec: 1.0,
          duration_sec: 3.8,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "blue_aura",
          trigger_sec: 0.5,
          duration_sec: 5.0,
          position_xy_percent: [50, 50],
          scale: 1.3
        },
        {
          layer_type: "slash_arc",
          trigger_sec: 4.5,
          duration_sec: 0.8
        }
      ],
      sound_design: {
        music: "hollow_purple_theme",
        sfx_name: "slash",
        sfx_trigger_sec: 4.5
      },
      text_overlay: "المجال اللانهائي: الفراغ غير المحدود"
    },
    {
      shot_number: 2,
      timeframe: "00:06 - 00:12",
      duration_seconds: 6.0,
      image_filename: "jjk_shot_02.jpg",
      image_prompt_en: "Sukuna laughing menacingly with malevolent shrine background",
      voiceover_egyptian: "سوكونا ملك اللعنات مكنش هيفوت الفرصة، ورد بابتسامة شريرة تقشعر الأبدان!",
      dialogue: [
        {
          id: "jjk_2_dlg_1",
          character: "sukuna",
          character_ar: "ريومن سوكونا",
          line_original: "Brat, you know nothing of true despair!",
          line_egyptian: "يا وله، أنت لسه مشوفتش حاجة من الجحيم اللي مستنيك.. استعد!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "(صوت عميق وشرير)",
          trigger_sec: 1.2,
          duration_sec: 4.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "lightning_burst",
          trigger_sec: 1.5,
          duration_sec: 3.0
        },
        {
          layer_type: "camera_shake",
          trigger_sec: 3.8,
          duration_sec: 1.2
        }
      ],
      sound_design: {
        music: "malevolent_shrine_theme",
        sfx_name: "heavy_impact",
        sfx_trigger_sec: 3.8
      },
      text_overlay: "توسيع المجال: ضريح الموت الشرير"
    }
  ]
};
