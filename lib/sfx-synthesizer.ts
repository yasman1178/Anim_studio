// lib/sfx-synthesizer.ts
// Real-time In-Browser Web Audio API Cinema Sound Effects Synthesizer
// Zero external files, instantaneous latency, 100% free and mobile-optimized

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("Web Audio API is only available in browser");
  }
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 1. Sub Boom Impact (Classic Cinema Hook Trailer Hit)
 * Fast 80Hz -> 22Hz exponential pitch drop with punchy attack and deep tail
 */
function playSubBoom(ctx: AudioContext, gainNode: GainNode) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(95, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(24, ctx.currentTime + 0.85);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.8);

  // Punch click
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = "triangle";
  clickOsc.frequency.setValueAtTime(160, ctx.currentTime);
  clickOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.06);
  clickGain.gain.setValueAtTime(0.7, ctx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

  gainNode.gain.setValueAtTime(0.95, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

  osc.connect(filter);
  filter.connect(gainNode);

  clickOsc.connect(clickGain);
  clickGain.connect(gainNode);

  osc.start(ctx.currentTime);
  clickOsc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.3);
  clickOsc.stop(ctx.currentTime + 0.08);
}

/**
 * 2. Giant Monster Roar (Throaty growl with modulated saw waves)
 */
function playMonsterRoar(ctx: AudioContext, gainNode: GainNode) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = "sawtooth";
  osc2.type = "square";
  lfo.type = "sine";

  osc1.frequency.setValueAtTime(55, ctx.currentTime);
  osc1.frequency.linearRampToValueAtTime(75, ctx.currentTime + 0.4);
  osc1.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.4);

  osc2.frequency.setValueAtTime(57, ctx.currentTime);
  osc2.frequency.linearRampToValueAtTime(78, ctx.currentTime + 0.4);
  osc2.frequency.exponentialRampToValueAtTime(37, ctx.currentTime + 1.4);

  // Tremolo/growl modulation
  lfo.frequency.setValueAtTime(25, ctx.currentTime);
  lfoGain.gain.setValueAtTime(15, ctx.currentTime);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(350, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.5);
  filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 1.4);
  filter.Q.value = 3.5;

  gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

  lfo.connect(osc1.frequency);
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  lfo.start(ctx.currentTime);

  osc1.stop(ctx.currentTime + 1.6);
  osc2.stop(ctx.currentTime + 1.6);
  lfo.stop(ctx.currentTime + 1.6);
}

/**
 * 3. Swoosh / Whip / Transition Fast Whoosh
 */
function playSwoosh(ctx: AudioContext, gainNode: GainNode) {
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15);
  filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.35);
  filter.Q.value = 2.0;

  gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 0.12);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

  noise.connect(filter);
  filter.connect(gainNode);

  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.4);
}

/**
 * 4. Heartbeat Slow (Double thump)
 */
function playHeartbeat(ctx: AudioContext, gainNode: GainNode) {
  const triggerThump = (startTime: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + duration);

    thumpGain.gain.setValueAtTime(0.8, startTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(thumpGain);
    thumpGain.connect(gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  };

  triggerThump(ctx.currentTime, 75, 0.18);
  triggerThump(ctx.currentTime + 0.25, 60, 0.22);
}

/**
 * 5. Magic Aura / Energy Surge
 */
function playAuraSurge(ctx: AudioContext, gainNode: GainNode) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(280, ctx.currentTime + 0.5);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);
  filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.9);
  filter.Q.value = 5.0;

  gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.3);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95);

  osc.connect(filter);
  filter.connect(gainNode);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.0);
}

/**
 * 6. Glitch / Tech Shock
 */
function playGlitch(ctx: AudioContext, gainNode: GainNode) {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.05);
  osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.15);

  gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  osc.connect(gainNode);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * Master SFX Trigger Method
 */
export function playSfx(sfxName: string, volumePercent: number = 80) {
  try {
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    const normalizedVol = Math.max(0.05, Math.min(1.0, (volumePercent / 100) * 0.8));
    masterGain.gain.value = normalizedVol;
    masterGain.connect(ctx.destination);

    const nameLower = (sfxName || "").toLowerCase();

    if (nameLower.includes("sub") || nameLower.includes("boom") || nameLower.includes("impact") || nameLower.includes("انفجار")) {
      playSubBoom(ctx, masterGain);
    } else if (nameLower.includes("roar") || nameLower.includes("monster") || nameLower.includes("وحش")) {
      playMonsterRoar(ctx, masterGain);
    } else if (nameLower.includes("swoosh") || nameLower.includes("whip") || nameLower.includes("whoosh") || nameLower.includes("سريع")) {
      playSwoosh(ctx, masterGain);
    } else if (nameLower.includes("heart") || nameLower.includes("beat") || nameLower.includes("نبض")) {
      playHeartbeat(ctx, masterGain);
    } else if (nameLower.includes("aura") || nameLower.includes("energy") || nameLower.includes("magic") || nameLower.includes("طاقة")) {
      playAuraSurge(ctx, masterGain);
    } else if (nameLower.includes("glitch") || nameLower.includes("system") || nameLower.includes("صدمة")) {
      playGlitch(ctx, masterGain);
    } else {
      // Default punchy cinematic hit
      playSubBoom(ctx, masterGain);
    }
  } catch (err) {
    console.warn("Could not play synthesized SFX:", err);
  }
}

export const CATALOG_SFX_PRESETS = [
  { name: "Sub Boom Impact", category: "Cinema Hooks", description: "ضربة بيز سينمائية هابطة للخطاف الأول", defaultVol: 90 },
  { name: "Giant Monster Roar", category: "Monsters", description: "زئير عملاق مشوه للوحوش والتهديد", defaultVol: 75 },
  { name: "Swoosh Fast Whip", category: "Transitions", description: "حركة سريعة وانتقال المشاهد", defaultVol: 70 },
  { name: "Heartbeat Slow", category: "Drama", description: "نبضات قلب درامية للحظات الشجن والصدمة", defaultVol: 50 },
  { name: "Dark Shadow Energy Aura", category: "VFX", description: "توهج هالة الظلال السحرية والتعاويذ", defaultVol: 65 },
  { name: "Glitch System Shock", category: "Interface", description: "صدمة رقمية ونظام غامض", defaultVol: 60 }
];
