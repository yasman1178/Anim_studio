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
    source_url: ""
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

export const SAMPLE_PROJECT_SOLO_LEVELING_SEASON_3: NotebookLMProject = {
  project_info: {
    project_name: "سولو ليفلينج الموسم 3 - الحلقة 1 (أول 3 دقائق)",
    anime_title: "Solo Leveling Season 3 (سولو ليفلينج)",
    episode: 1,
    total_shots: 5,
    default_channel: "محب أنمي",
    target_language: "العربية المصرية",
    aspect_ratio: "16:9",
    source_url: ""
  },
  character_voice_mapping: {
    "Seif (Sung Jinwoo)": {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "سيف (سونغ جين وو)",
      gender: "male",
      pitch: "-2Hz",
      rate: "+5%"
    },
    "Ice Elf Boss": {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "زعيم وحوش الثلج",
      gender: "male",
      pitch: "-12Hz",
      rate: "-8%"
    },
    "Tarek (Jinho)": {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "طارق (جين هو)",
      gender: "male",
      pitch: "+4Hz",
      rate: "+12%"
    },
    "Association Official 1": {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "مسؤول الهيئة 1",
      gender: "male",
      pitch: "-4Hz",
      rate: "-3%"
    },
    "Association Official 2 (Foreign / Foreign Rep)": {
      voice_name: "ar-EG-ShakirNeural",
      character_ar: "ممثل الهيئة الدولي",
      gender: "male",
      pitch: "-6Hz",
      rate: "-5%"
    }
  },
  shots: [
    {
      shot_number: 1,
      timeframe: "00:00 - 00:35",
      duration_seconds: 35.0,
      text_overlay: "المستوى 100 - تطهير البوابة!",
      image_filename: "shot_01_snow_dungeon_ambush.png",
      image_prompt_en: "Solo Leveling style vertical anime shot, Sung Jinwoo standing in a frozen snowy dungeon holding glowing daggers, surrounded by ice elf monsters in shadow",
      voiceover_egyptian: "في أطراف البوابة الجليدية, سيف واجه زعيم وحوش الثلج بعد ما قضى على جيشه بالكامل ووصل للمستوى مية!",
      dialogue: [
        {
          id: "s3_shot_1_dlg_1",
          character: "Ice Elf Boss",
          character_ar: "زعيم وحوش الثلج",
          line_original: "was it you the one who's been killing my people... all this ends here, my people are already lying in wait!",
          line_egyptian: "هو أنت اللي قاعد تصفّي في رجالي؟ مبهور إنك وصلت لحد هنا بجسمك الصغير ده وكمان بتتكلم لغتنا! بس كل ده هينتهي هنا, رجالي مستنيين إشارتي!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "استعلاء وتهديد غاضب",
          trigger_sec: 5.0,
          duration_sec: 14.0,
          status: 'done'
        },
        {
          id: "s3_shot_1_dlg_2",
          character: "Seif (Sung Jinwoo)",
          character_ar: "سيف (سونغ جين وو)",
          line_original: "small? that's funny. come out!",
          line_egyptian: "صغير؟ حاجة تضحّك بجد! طيّب ورّيني الكمين اللي أنت جهزته ده!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "سخرية هادئة ونبرة ثقة مطلق",
          trigger_sec: 22.0,
          duration_sec: 8.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "dark_purple_shadow_slashes",
          trigger_sec: 20.0,
          duration_sec: 5.0,
          position_xy_percent: [50, 50],
          scale: 1.4
        }
      ],
      sound_design: {
        music: "Fast Action Dark Anime Theme",
        sfx_name: "Ice_Shatter_And_Dagger_Slash",
        sfx_trigger_sec: 22.0
      }
    },
    {
      shot_number: 2,
      timeframe: "00:35 - 01:10",
      duration_seconds: 35.0,
      text_overlay: "تدخل النظام الملعون!",
      image_filename: "shot_02_interrogation_system.png",
      image_prompt_en: "Jinwoo holding the ice elf boss by his collar, purple eyes glowing brightly while blue system warning notifications flicker in the air",
      voiceover_egyptian: "سيف قضى على الكمين في ثواني, ولما بدأ يستجوب الزعيم لمعرفة سر النظام, تدخل النظام ومنعه من الكلام!",
      dialogue: [
        {
          id: "s3_shot_2_dlg_1",
          character: "Ice Elf Boss",
          character_ar: "زعيم وحوش الثلج",
          line_original: "what? what's going on? seems like no one is left!",
          line_egyptian: "إيه ده؟! إيه اللي بيحصل ده؟! محدش فاضي منهم أصلاً?!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "رعب وصدمة عارمة",
          trigger_sec: 2.0,
          duration_sec: 6.0,
          status: 'done'
        },
        {
          id: "s3_shot_2_dlg_2",
          character: "Seif (Sung Jinwoo)",
          character_ar: "سيف (سونغ جين وو)",
          line_original: "you thought you could toy with me? now you will answer my questions!",
          line_egyptian: "ابتدينا يا أنجاس! كنتم فاكرين إنكم بتلعبوا معايا؟ دلوقتي هتجاوبني على أسئلتي وإلا العذاب هيكون أشد!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "حزم وإصرار شديد",
          trigger_sec: 10.0,
          duration_sec: 9.0,
          status: 'done'
        },
        {
          id: "s3_shot_2_dlg_3",
          character: "Seif (Sung Jinwoo)",
          character_ar: "سيف (سونغ جين وو)",
          line_original: "still learned nothing. I'm certain this is all the system's interference. sooner or later I'll uncover everything.",
          line_egyptian: "برضه ما خرجتش بمعلومة واحدة! متأكد إن ده تدخل من النظام.. مش مشكلة, ملحوقة, قريب أوي هعرف كل حاجة.",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "تأفف وغموض هادئ",
          trigger_sec: 21.0,
          duration_sec: 10.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "cyan_system_window_glitch",
          trigger_sec: 18.0,
          duration_sec: 4.0,
          position_xy_percent: [50, 40],
          scale: 1.1
        }
      ],
      sound_design: {
        music: "Mysterious Suspense Synth",
        sfx_name: "System_Notification_Glitch_SFX",
        sfx_trigger_sec: 19.0
      }
    },
    {
      shot_number: 3,
      timeframe: "01:10 - 01:50",
      duration_seconds: 40.0,
      text_overlay: "مفتاح معبد كارتينون - المتاهة المزدوجة",
      image_filename: "shot_03_cartenon_key.png",
      image_prompt_en: "Close-up of Jinwoo holding an ancient dark golden ornate key glowing with ominous red magic, dark ruins of Cartenon temple blurred in background",
      voiceover_egyptian: "سيف طلع المفتاح اللي نزل له من الصندوق الملعون في جزيرة جيجو, بعد ما وصل للمستوى مية وحقق الشروط.. مفتاح العودة للمتاهة المزدوجة!",
      dialogue: [
        {
          id: "s3_shot_3_dlg_1",
          character: "Seif (Sung Jinwoo)",
          character_ar: "سيف (سونغ جين وو)",
          line_original: "the key that dropped from the cursed box... I reached level 100. the key to the Cartenon temple... the double dungeon! the system is calling me again.",
          line_egyptian: "المفتاح اللي نزل من الصندوق الملعون في غارة جيجو.. وصلت للمستوى مية وحققت الشروط! مفتاح معبد كارتينون.. المكان ده مستحيل أنساه.. المتاهة المزدوجة! النظام بيناديني تاني لنفس المكان اللي بدأ منه كل حاجة.",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "صوت خفيض ونبرة تأمل وهيبة",
          trigger_sec: 5.0,
          duration_sec: 18.0,
          status: 'done'
        },
        {
          id: "s3_shot_3_dlg_2",
          character: "Seif (Sung Jinwoo)",
          character_ar: "سيف (سونغ جين وو)",
          line_original: "if it's waiting for my return... then let it wait. I'll be back soon.",
          line_egyptian: "لو كان كل ده متخطط له من البداية وبيستناني أرجع.. يبقى خليه يستنى شوية! راجع له قريب أوي.",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "حسم وإصرار قوي",
          trigger_sec: 25.0,
          duration_sec: 9.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "red_dark_magic_aura",
          trigger_sec: 10.0,
          duration_sec: 8.0,
          position_xy_percent: [50, 60],
          scale: 1.2
        }
      ],
      sound_design: {
        music: "Epic Ominous Choir Resonation",
        sfx_name: "Temple_Key_Glow_Hum",
        sfx_trigger_sec: 12.0
      }
    },
    {
      shot_number: 4,
      timeframe: "01:50 - 02:25",
      duration_seconds: 35.0,
      text_overlay: "قوة لا يمكن قياسها!",
      image_filename: "shot_04_association_reaction.png",
      image_prompt_en: "High-tech Hunters Association control room with large holographic screens showing Jinwoo's combat stats, officials standing in disbelief",
      voiceover_egyptian: "في هيئة الصيادين, العالم كله بيكتب عن سيف بعد ما طهّر البوابة وحده.. وبقى قوة غير قابلة للتصنيف في أي دولة!",
      dialogue: [
        {
          id: "s3_shot_4_dlg_1",
          character: "Association Official 1",
          character_ar: "مسؤول الهيئة 1",
          line_original: "it wasn't a raid anymore, it was a collapse! Korea is calling him a hero.",
          line_egyptian: "الموضوع ما بقاش مجرد غارة عادي.. دي كانت كوارث وانهيارات متتالية وهو دخل بعد ما الكل فشل! كوريا كلها بتعتبره بطل قومي دلوقتي!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "انبهار واندهاش شديد",
          trigger_sec: 3.0,
          duration_sec: 12.0,
          status: 'done'
        },
        {
          id: "s3_shot_4_dlg_2",
          character: "Association Official 2 (Foreign / Foreign Rep)",
          character_ar: "ممثل الهيئة الدولي",
          line_original: "no measurable limit, no confirmed class... Korea doesn't have a new S-rank, they have something no country can classify!",
          line_egyptian: "مش ده اللي مقلقنا! المقلق إن مالوش حد أقصى في القوة, ولا فئة محددة, ولا سقف للحيوانات المستدعاة! كوريا ما عندهاش صياد رتبة إس جديد.. كوريا عندها كائن مش قادر أي بلد في العالم يصنفه!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "قلق وجدية سينمائية",
          trigger_sec: 16.0,
          duration_sec: 14.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "hologram_data_stream",
          trigger_sec: 5.0,
          duration_sec: 6.0,
          position_xy_percent: [50, 45],
          scale: 1.3
        }
      ],
      sound_design: {
        music: "Suspenseful Orchestral News Theme",
        sfx_name: "Hologram_Beep_And_Data_Scan",
        sfx_trigger_sec: 8.0
      }
    },
    {
      shot_number: 5,
      timeframe: "02:25 - 03:00",
      duration_seconds: 35.0,
      text_overlay: "تأسيس نقابة اللعب الفردي!",
      image_filename: "shot_05_guild_office_cores.png",
      image_prompt_en: "Modern clean office of Solo Play guild, Jinho looking surprised at Jinwoo who is dumping high-rank glowing blue magic cores onto the wooden desk",
      voiceover_egyptian: "طارق كان قاعد في مقر النقابة يطرد المشككين ويحمي سمعة سيف, لحد ما سيف وصل وجايب معاه بلورات سحرية نادرة لتمويل النقابة!",
      dialogue: [
        {
          id: "s3_shot_5_dlg_1",
          character: "Tarek (Jinho)",
          character_ar: "طارق (جين هو)",
          line_original: "these damn trolls! I won't forgive anyone who slanders sensei! crying after you get sued won't help you!",
          line_egyptian: "الهبادين والمشككين دول أنا مش هسيبهم! بتشتموا في السنسيه وبترجعوا تعيطوا بعد القضية؟! مسحت حوار تاني بفضل الله!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "عصبية فكاهية وصراخ على الشاشة",
          trigger_sec: 2.0,
          duration_sec: 9.0,
          status: 'done'
        },
        {
          id: "s3_shot_5_dlg_2",
          character: "Tarek (Jinho)",
          character_ar: "طارق (جين هو)",
          line_original: "sensei! he just comes and goes without a sound... did anything happen?",
          line_egyptian: "سنسيه! بتدخل وتخرج من غير أي صوت كالعادة.. في حاجة حصلت ولا إيه؟",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "فزعة وكلام سريع بحماس",
          trigger_sec: 12.0,
          duration_sec: 6.0,
          status: 'done'
        },
        {
          id: "s3_shot_5_dlg_3",
          character: "Seif (Sung Jinwoo)",
          character_ar: "سيف (سونغ جين وو)",
          line_original: "I just got out of a gate... you said we needed some money to establish the guild, right?",
          line_egyptian: "لا يا طارق, أنا لسه طالع من بوابة حالا.. مش كنت بتقول محتاجين سيولة عشان نأسس النقابة؟ خد البلورات السحرية عالية النقاء دي.",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "هدوء وثقة مريحة",
          trigger_sec: 19.0,
          duration_sec: 9.0,
          status: 'done'
        },
        {
          id: "s3_shot_5_dlg_4",
          character: "Tarek (Jinho)",
          character_ar: "طارق (جين هو)",
          line_original: "aren't these greater magic cores?! you're incredible sensei! with this we won't have to worry about paying employee salaries!",
          line_egyptian: "مش ممكن! بلورات سحرية نادرة من فئة عالية?! أنت ماليش حل يا سنسيه! كده مش هنقلق على مرتبات الموظفين إطلاقاً!",
          voice_model: "ar-EG-ShakirNeural",
          vocal_cue: "انبهار وفرحة هستيرية",
          trigger_sec: 28.0,
          duration_sec: 7.0,
          status: 'done'
        }
      ],
      vfx_spatial_layers: [
        {
          layer_type: "blue_magic_core_glimmer",
          trigger_sec: 22.0,
          duration_sec: 6.0,
          position_xy_percent: [50, 70],
          scale: 1.2
        }
      ],
      sound_design: {
        music: "Upbeat Comedy Anime Background",
        sfx_name: "Magic_Core_Clink_On_Desk",
        sfx_trigger_sec: 23.0
      }
    }
  ]
};

