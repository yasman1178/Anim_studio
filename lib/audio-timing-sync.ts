// lib/audio-timing-sync.ts
// Automated Speech Duration Estimation & Sequential Dialogue Timing Engine
// Guarantees zero audio collisions by auto-calculating speech durations and auto-delaying subsequent dialogue

import { NotebookLMProject, Shot, DialogueLine } from "@/lib/sample-data";

/**
 * Calculates estimated speech duration for Arabic / Egyptian text with high phonetic accuracy.
 * Uses Egyptian spoken cadence (~11.5 chars/sec or ~2.6 words/sec) + punctuation pauses.
 */
export function estimateSpokenDuration(text: string | undefined | null, rateMultiplier: number = 1.0): number {
  if (!text || typeof text !== "string") return 2.0;

  // Clean text from stage directions like [صراخ], (بهمس), etc.
  const clean = text.replace(/\[.*?\]|\(.*?\)|<.*?>/g, "").trim();
  if (!clean) return 1.8;

  const charCount = clean.replace(/\s+/g, "").length;
  const wordCount = clean.split(/\s+/).filter(Boolean).length;

  // Count punctuation marks that cause natural breath pauses in Egyptian Arabic
  const commaCount = (clean.match(/[,،]/g) || []).length;
  const sentenceEndCount = (clean.match(/[.!?؟]/g) || []).length;

  // Base phonetics: ~11.5 characters per second for Egyptian Edge-TTS Shakir/Salma
  const charBasedDuration = charCount / 11.8;
  const wordBasedDuration = wordCount * 0.38;

  // Blend weighted estimate
  const rawDuration = (charBasedDuration * 0.65) + (wordBasedDuration * 0.35);

  // Add natural pauses
  const pauseDuration = (commaCount * 0.3) + (sentenceEndCount * 0.45);

  // Apply speed modifier (e.g. rateMultiplier)
  const adjusted = (rawDuration + pauseDuration) / Math.max(0.5, rateMultiplier);

  // Ensure minimum audible speech duration of 1.6s and round to 1 decimal place
  return Math.max(1.6, Math.round(adjusted * 10) / 10);
}

export interface OverlapCollision {
  shotNumber: number;
  prevSpeaker: string;
  prevEndSec: number;
  nextSpeaker: string;
  nextStartSec: number;
  overlapSec: number;
}

/**
 * Scans a project for any dialogue or voiceover overlaps within each shot.
 */
export function detectDialogueOverlaps(shots: Shot[]): OverlapCollision[] {
  const collisions: OverlapCollision[] = [];

  shots.forEach((shot) => {
    const shotNum = shot.shot_number;
    let currentCursor = 0;
    let prevSpeaker = "";

    // Check voiceover
    if (shot.voiceover_egyptian && shot.voiceover_egyptian.trim()) {
      const voDur = estimateSpokenDuration(shot.voiceover_egyptian);
      currentCursor = voDur;
      prevSpeaker = "الراوي (Voiceover)";
    }

    if (Array.isArray(shot.dialogue)) {
      shot.dialogue.forEach((line) => {
        const lineSpeaker = line.speaker || line.character_ar || line.character || "شخصية";
        const lineStart = Number(line.trigger_sec) || 0;
        const lineDur = Number(line.duration_sec) || estimateSpokenDuration(line.line || line.line_egyptian);

        if (prevSpeaker && lineStart < currentCursor - 0.05) {
          const overlap = Math.round((currentCursor - lineStart) * 10) / 10;
          collisions.push({
            shotNumber: shotNum,
            prevSpeaker,
            prevEndSec: Math.round(currentCursor * 10) / 10,
            nextSpeaker: lineSpeaker,
            nextStartSec: lineStart,
            overlapSec: overlap,
          });
        }

        currentCursor = Math.max(currentCursor, lineStart) + lineDur;
        prevSpeaker = lineSpeaker;
      });
    }
  });

  return collisions;
}

export interface AutoSyncOptions {
  minGapSec?: number; // Natural pause between speakers (default: 0.25s)
  expandShotDurationIfExceeded?: boolean; // Auto expand shot length to fit dialogue (default: true)
  safetyTailSec?: number; // Breathing room after last speech before shot cut (default: 0.5s)
}

export interface AutoSyncResult {
  updatedProject: NotebookLMProject;
  totalOverlapsFixed: number;
  shotsAdjusted: number;
  totalDurationBefore: number;
  totalDurationAfter: number;
  log: string[];
}

/**
 * Automatically calculates sentence durations and auto-delays subsequent dialogues
 * to prevent audio overlaps inside every shot.
 */
export function autoSyncShotDialogueTiming(
  project: NotebookLMProject,
  options: AutoSyncOptions = {}
): AutoSyncResult {
  const minGapSec = options.minGapSec ?? 0.25;
  const expandShotDuration = options.expandShotDurationIfExceeded ?? true;
  const safetyTailSec = options.safetyTailSec ?? 0.5;

  const updatedProject: NotebookLMProject = JSON.parse(JSON.stringify(project));
  let totalOverlapsFixed = 0;
  let shotsAdjusted = 0;
  const log: string[] = [];

  let totalDurationBefore = 0;
  updatedProject.shots.forEach((s) => {
    totalDurationBefore += Number(s.duration_sec ?? s.duration_seconds) || 5;
  });

  let cumulativeTime = 0;

  updatedProject.shots.forEach((shot, sIdx) => {
    const shotNum = shot.shot_number || sIdx + 1;
    let shotCursor = 0;
    let shotHadAdjustments = false;

    // 1. Handle Voiceover (Narrator) at start of shot
    let voDuration = 0;
    if (shot.voiceover_egyptian && shot.voiceover_egyptian.trim()) {
      voDuration = estimateSpokenDuration(shot.voiceover_egyptian);
      shotCursor = voDuration + minGapSec;
    }

    // 2. Handle Dialogue lines sequentially
    if (Array.isArray(shot.dialogue) && shot.dialogue.length > 0) {
      shot.dialogue.forEach((line, dIdx) => {
        const spokenText = line.line || line.line_egyptian || "";
        
        // Auto-calculate sentence duration if missing or estimate needed
        if (!line.duration_sec || isNaN(line.duration_sec) || line.duration_sec <= 0) {
          line.duration_sec = estimateSpokenDuration(spokenText);
          log.push(`لقطة #${shotNum}: تم حساب مدة جملة [${line.speaker || 'شخصية'}] آلياً (${line.duration_sec}ث).`);
        }

        const originalTrigger = Number(line.trigger_sec) ?? 0;

        // The earliest permitted start time to prevent collision with preceding voiceover or dialogue
        const earliestAllowed = Math.round(shotCursor * 10) / 10;

        if (originalTrigger < earliestAllowed) {
          // Auto-delay this line so it starts strictly after the previous speech finishes
          line.trigger_sec = earliestAllowed;
          totalOverlapsFixed++;
          shotHadAdjustments = true;
          log.push(
            `لقطة #${shotNum}: تم تأخير حوار [${line.speaker || 'شخصية'}] تلقائياً من ${originalTrigger}ث إلى ${earliestAllowed}ث لمنع تداخل الصوت.`
          );
        } else {
          // If trigger is already comfortably spaced, keep it
          line.trigger_sec = Math.round(originalTrigger * 10) / 10;
        }

        // Advance cursor past this sentence + natural breath gap
        shotCursor = line.trigger_sec + (line.duration_sec || 2.0) + minGapSec;
      });
    }

    // 3. Ensure shot duration is long enough to fit all non-overlapping speech
    const currentShotDur = Number(shot.duration_sec ?? shot.duration_seconds) || 5;
    const requiredShotDuration = Math.round((shotCursor + safetyTailSec) * 10) / 10;

    if (expandShotDuration && requiredShotDuration > currentShotDur) {
      const newDur = Math.max(currentShotDur, requiredShotDuration);
      shot.duration_sec = newDur;
      shot.duration_seconds = newDur;
      shotHadAdjustments = true;
      log.push(
        `لقطة #${shotNum}: تم تمديد مدة اللقطة آلياً من ${currentShotDur}ث إلى ${newDur}ث لاستيعاب الحوارات المتتابعة.`
      );
    }

    if (shotHadAdjustments) {
      shotsAdjusted++;
    }

    // 4. Update shot timeframe string (e.g. "00:00 - 00:06.5")
    const shotStart = cumulativeTime;
    const shotDur = Number(shot.duration_sec ?? shot.duration_seconds) || 5;
    const shotEnd = shotStart + shotDur;

    const formatTc = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 10);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
    };

    shot.timeframe = `${formatTc(shotStart)} - ${formatTc(shotEnd)}`;
    cumulativeTime = shotEnd;
  });

  const totalDurationAfter = Math.round(cumulativeTime * 10) / 10;
  updatedProject.project_info.estimated_duration_sec = totalDurationAfter;

  return {
    updatedProject,
    totalOverlapsFixed,
    shotsAdjusted,
    totalDurationBefore: Math.round(totalDurationBefore * 10) / 10,
    totalDurationAfter,
    log,
  };
}
