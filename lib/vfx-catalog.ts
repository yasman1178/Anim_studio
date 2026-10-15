export interface VfxItem {
  id: string;
  name_ar: string;
  category: 'combat' | 'energy' | 'elements' | 'drama' | 'ui';
  description_ar: string;
  isProcedural: boolean;
  defaultDurationSec: number;
}

export const VFX_CATALOG: VfxItem[] = [
  // Combat & Action
  {
    id: "speed_lines",
    name_ar: "خطوط سرعة الأنمي (Speed Lines)",
    category: "combat",
    description_ar: "خطوط سرعة شعاعية مكثفة تعطي شعوراً بالحركة السريعة والاندفاع في القتال.",
    isProcedural: true,
    defaultDurationSec: 2.5
  },
  {
    id: "camera_shake",
    name_ar: "اهتزاز الكاميرا (Camera Shake)",
    category: "combat",
    description_ar: "ارتجاج ديناميكي لعدسة الكاميرا عند حدوث ضربة قوية أو انفجار.",
    isProcedural: true,
    defaultDurationSec: 0.8
  },
  {
    id: "slash_arc",
    name_ar: "قوس ضربة السيف (Slash Arc)",
    category: "combat",
    description_ar: "أثر ساطع ومقوس لضربة سيف حادة تقطع الشاشة.",
    isProcedural: true,
    defaultDurationSec: 0.6
  },
  {
    id: "impact_flash",
    name_ar: "وميض الصدمة (Impact Flash)",
    category: "combat",
    description_ar: "وميض أبيض أو أحمر سريع جداً يبرز لحظة التلامس والضربة.",
    isProcedural: true,
    defaultDurationSec: 0.3
  },
  {
    id: "shockwave",
    name_ar: "موجة الصدمة (Shockwave)",
    category: "combat",
    description_ar: "حلقة دائرية متموجة تتسع من مركز الضربة مسببة تشوهاً بصرياً.",
    isProcedural: true,
    defaultDurationSec: 1.0
  },

  // Energy & Supernatural
  {
    id: "blue_aura",
    name_ar: "هالة طاقة زرقاء (Blue Aura)",
    category: "energy",
    description_ar: "هالة طاقة متوهجة بالأزرق والنيون تحيط بالشخصية أو المشهد.",
    isProcedural: true,
    defaultDurationSec: 3.5
  },
  {
    id: "red_eye_glow",
    name_ar: "توهج العيون الأحمر (Red Eye Glow)",
    category: "energy",
    description_ar: "توهج أحمر سينمائي مرعب ينبعث من عيون البطل أو الوحش في اللحظات الحاسمة.",
    isProcedural: true,
    defaultDurationSec: 2.5
  },
  {
    id: "electric_spark",
    name_ar: "شرارات كهربائية (Electric Spark)",
    category: "energy",
    description_ar: "صواعق وشرارات برق زرقاء وصفراء تتفرع وتتراقص في المشهد.",
    isProcedural: true,
    defaultDurationSec: 2.0
  },
  {
    id: "energy_pulse",
    name_ar: "نبضة طاقة (Energy Pulse)",
    category: "energy",
    description_ar: "حلقات طاقة متتالية تشحن قدرة الشخصية الخارقة.",
    isProcedural: true,
    defaultDurationSec: 2.0
  },

  // Drama & Atmosphere
  {
    id: "vignette",
    name_ar: "تعتيم سينمائي (Cinematic Vignette)",
    category: "drama",
    description_ar: "تعتيم ناعم وتدريجي لأطراف الشاشة لتركيز نظر المشاهد على مركز الحدث.",
    isProcedural: true,
    defaultDurationSec: 4.0
  },
  {
    id: "dramatic_zoom",
    name_ar: "تقريب درامي (Dramatic Zoom)",
    category: "drama",
    description_ar: "حركة تقريب سريعة تركز على ملامح الشخصية أو رد فعلها الصادم.",
    isProcedural: true,
    defaultDurationSec: 1.5
  }
];

export interface SfxItem {
  id: string;
  name_ar: string;
  category: string;
  synthType: 'whoosh' | 'impact' | 'slash' | 'charge' | 'rumble' | 'beep';
}

export const SFX_CATALOG: SfxItem[] = [
  { id: "whoosh", name_ar: "صوت حركة سريعة (Whoosh)", category: "حركة", synthType: "whoosh" },
  { id: "heavy_impact", name_ar: "صدمة وارتطام ثقيل (Heavy Impact)", category: "قتال", synthType: "impact" },
  { id: "slash", name_ar: "ضربة سيف حادة (Sword Slash)", category: "أسلحة", synthType: "slash" },
  { id: "energy_charge", name_ar: "شحن طاقة خارقة (Energy Charge)", category: "خوارق", synthType: "charge" },
  { id: "energy_pulse", name_ar: "نبضة طاقة (Energy Pulse)", category: "خوارق", synthType: "beep" },
  { id: "low_rumble", name_ar: "هدير وزلزال منخفض (Low Rumble)", category: "أجواء", synthType: "rumble" },
  { id: "lightning_burst", name_ar: "صاعقة رعدية (Lightning Bolt)", category: "طبيعة", synthType: "impact" }
];

// In-Browser Web Audio SFX Synthesizer
// Generates realistic procedural anime SFX on the fly with zero external dependencies!
export function playSynthesizedSfx(type: string, volume: number = 0.5) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    if (type === 'whoosh') {
      // Noise buffer filtered with rising then falling cutoff
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.38);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      whiteNoise.start(now);
      whiteNoise.stop(now + 0.4);
    } else if (type === 'impact') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'slash') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'charge') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.85);
    } else {
      // Default notification beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch {
    // Ignore audio context errors if user hasn't interacted with page yet
  }
}
