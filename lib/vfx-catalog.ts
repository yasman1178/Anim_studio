import { playSfx } from "./sfx-synthesizer";

export interface VfxItem {
  id: string;
  name_ar: string;
  category: 'combat' | 'energy' | 'elements' | 'drama' | 'ui';
  description_ar: string;
  isProcedural: boolean;
  defaultDurationSec: number;
}

export const VFX_CATALOG: VfxItem[] = [
  // Dark Fantasy & V18 Specials
  {
    id: "dark_purple_shadow_aura",
    name_ar: "هالة طاقة الظلال البنفسجية (Seif Shadow Aura)",
    category: "energy",
    description_ar: "هالة ظلال غامضة باللون البنفسجي الداكن والأسود تحيط بالخنجر وبسيف في لحظات الخطر.",
    isProcedural: true,
    defaultDurationSec: 3.5
  },
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

export interface SfxCatalogItem {
  id: string;
  name_ar: string;
  category: string;
  sfxName: string;
}

export const SFX_CATALOG: SfxCatalogItem[] = [
  { id: "sub_boom", name_ar: "Sub Boom ضربة بيز الخطاف", category: "سينمائي Hook", sfxName: "Sub Boom Impact" },
  { id: "giant_roar", name_ar: "Giant Roar زئير الوحش", category: "وحوش وعمالقة", sfxName: "Giant Monster Roar" },
  { id: "fast_swoosh", name_ar: "Swoosh حركة وسوط سريع", category: "انتقالات وحركة", sfxName: "Swoosh Fast Whip" },
  { id: "slow_heartbeat", name_ar: "Heartbeat نبض القلب الدرامي", category: "شجن وصدمة", sfxName: "Heartbeat Slow" },
  { id: "dark_aura", name_ar: "Dark Aura هالة الظلال السحرية", category: "طاقة وسحر", sfxName: "Dark Shadow Energy Aura" },
  { id: "glitch_shock", name_ar: "Glitch صدمة النظام الرقمي", category: "واجهة النظام", sfxName: "Glitch System Shock" }
];

export function playSynthesizedSfx(sfxIdOrName: string, volume: number = 80) {
  playSfx(sfxIdOrName, volume);
}
