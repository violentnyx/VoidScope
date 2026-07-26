"use client";

import {
  defineSound,
  ensureReady,
  type Layer,
  type MultiLayerSound,
  type SoundDefinition,
} from "@web-kits/audio";
import { isSiteSoundEnabled } from "@/lib/site-sound-store";

/**
 * Small UI sound kit for the site, styled after basement.studio's
 * Shader Lab sound design (src/lib/audio/shader-lab-sounds.ts) —
 * same declarative shape (source + envelope + optional effects, via
 * @web-kits/audio) — but tuned to sit *under* the CRT/blood-gradient
 * background instead of announcing itself:
 *
 * - G natural minor instead of Shader Lab's G major. The flat 3rd,
 *   6th and 7th are what make a scale read as "dark" rather than
 *   "cheerful" — same shape of function (`note()` mirrors their
 *   `gMajor()`), different palette.
 * - Everything sits about an octave lower (G2–G3 instead of
 *   G4–G5) — chest register, not the bright octave most UI kits
 *   live in.
 * - Only sine/triangle sources, soft attacks (never 0), gain capped
 *   around 0.03–0.06. Nothing here should be audible over a video
 *   or music — it's a texture, not a notification.
 */

// "Ab" isn't part of the natural minor scale itself — it's kept
// around only as a half-step clash under `error`, below.
type DarkPitchClass = "G" | "A" | "Ab" | "Bb" | "C" | "D" | "Eb" | "F";
type DarkOctave = 1 | 2 | 3 | 4;
export type DarkNote = `${DarkPitchClass}${DarkOctave}`;

const NOTE_OFFSETS: Record<DarkPitchClass, number> = {
  C: -9,
  D: -7,
  Eb: -6,
  F: -4,
  G: -2,
  Ab: -1,
  A: 0,
  Bb: 1,
};

/** Frequency for a note in the dark scale above (A4 = 440Hz reference). */
export function note(darkNote: DarkNote): number {
  const match = darkNote.match(/^([A-G]b?)(\d)$/);
  if (!match) {
    throw new Error(`Invalid note: ${darkNote}`);
  }
  const [, pitchClass, octaveValue] = match;
  const octave = Number(octaveValue);
  const semitoneOffset = NOTE_OFFSETS[pitchClass as DarkPitchClass];
  const semitonesFromA4 = semitoneOffset + (octave - 4) * 12;
  return 440 * 2 ** (semitonesFromA4 / 12);
}

function noteGlide(start: DarkNote, end: DarkNote) {
  return { start: note(start), end: note(end) };
}

/** Soft, muted single tone — sine/triangle only, gentle attack. */
function darkTone(
  frequency: number | { start: number; end: number },
  gain: number,
  decay: number,
  extra?: Partial<Layer>
): Layer {
  return {
    source: { type: "triangle", frequency },
    envelope: { attack: 0.01, decay, sustain: 0, release: 0.09 },
    gain,
    ...extra,
  };
}

/** Two muted tones a beat apart, softened with a touch of reverb — for state changes (on/off, undo-style). */
function darkPair(
  first: DarkNote,
  second: DarkNote,
  gain: number,
  decay: number
): MultiLayerSound {
  return {
    effects: [{ type: "reverb", mix: 0.14, preDelay: 0.012, decay: 0.9, damping: 0.7 }],
    layers: [
      darkTone(note(first), gain, decay, { pan: -0.04 }),
      darkTone(note(second), gain * 0.85, decay, { delay: 0.045, pan: 0.04 }),
    ],
  };
}

/** Low, sustained confirmation thud with a longer tail — for a completed save. */
function darkConfirm(base: DarkNote, fifth: DarkNote, gain: number): MultiLayerSound {
  return {
    effects: [{ type: "reverb", mix: 0.2, preDelay: 0.02, decay: 1.4, damping: 0.65 }],
    layers: [
      darkTone(note(base), gain, 0.32, {
        envelope: { attack: 0.015, decay: 0.32, sustain: 0.08, release: 0.4 },
        pan: -0.05,
      }),
      darkTone(note(fifth), gain * 0.7, 0.34, {
        delay: 0.03,
        envelope: { attack: 0.02, decay: 0.34, sustain: 0.06, release: 0.42 },
        pan: 0.05,
      }),
    ],
  };
}

export type SiteUISoundId = "press" | "nav" | "toggleOn" | "toggleOff" | "save" | "error" | "scroll";

export const SITE_UI_SOUND_DEFINITIONS = {
  // Generic button press (logout, etc.) — one low, soft tone.
  press: {
    effects: [{ type: "reverb", mix: 0.1, preDelay: 0.008, decay: 0.5, damping: 0.7 }],
    layers: [darkTone(note("G2"), 0.05, 0.1)],
  },

  // Nav pill click — quieter still, it fires on every page change.
  nav: {
    layers: [darkTone(note("D3"), 0.03, 0.06)],
  },

  // Scroll texture — very short and very quiet, throttled by ScrollSound.
  scroll: {
    layers: [darkTone(noteGlide("G2", "Bb2"), 0.014, 0.035)],
  },

  // Section/page toggled on — small upward minor third.
  toggleOn: darkPair("Eb2", "G2", 0.045, 0.09),

  // Toggled off — the same interval, descending.
  toggleOff: darkPair("G2", "Eb2", 0.045, 0.09),

  // Settings saved — low root + fifth, longer and warmer.
  save: darkConfirm("G2", "D2", 0.055),

  // Save failed — same shape as `press`, but a flat, dissonant minor
  // second instead of a clean tone. Still quiet; a wrongness cue,
  // not an alarm.
  error: {
    effects: [{ type: "reverb", mix: 0.12, preDelay: 0.008, decay: 0.6, damping: 0.6 }],
    layers: [
      darkTone(note("G2"), 0.05, 0.14),
      darkTone(noteGlide("Ab2", "G2"), 0.03, 0.16, { delay: 0.01 }),
    ],
  },
} satisfies Record<SiteUISoundId, SoundDefinition>;

const SITE_UI_SOUND_PLAYERS = Object.fromEntries(
  Object.entries(SITE_UI_SOUND_DEFINITIONS).map(([id, definition]) => [
    id,
    defineSound(definition),
  ])
) as Record<SiteUISoundId, ReturnType<typeof defineSound>>;

let readyPromise: Promise<void> | null = null;

function ensureAudioReady() {
  if (typeof window === "undefined") return null;
  if (!readyPromise) {
    readyPromise = ensureReady()
      .then(() => undefined)
      .catch(() => {
        readyPromise = null;
      });
  }
  return readyPromise;
}

/** Play one of the site's UI sounds. No-ops on the server, when sound is muted, or before the first user gesture has unlocked audio. */
export function playUISound(soundId: SiteUISoundId) {
  if (typeof window === "undefined") return;
  if (!isSiteSoundEnabled()) return;

  const ready = ensureAudioReady();
  if (!ready) return;

  void ready.then(() => {
    if (!isSiteSoundEnabled()) return;
    SITE_UI_SOUND_PLAYERS[soundId]?.();
  });
}
