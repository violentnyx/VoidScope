"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether UI sounds are on. Persisted to localStorage so a visitor's
 * choice sticks across pages/visits. Defaults to on — the sounds
 * themselves are intentionally subtle (see site-sounds.ts), so this
 * is here mainly for people on shared/quiet devices who want to kill
 * it entirely.
 */
const STORAGE_KEY = "nyx:sound-enabled";

type Listener = () => void;
const listeners = new Set<Listener>();

function readInitial(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "1";
}

let enabled = readInitial();

function emit() {
  for (const listener of listeners) listener();
}

export function isSiteSoundEnabled(): boolean {
  return enabled;
}

export function setSiteSoundEnabled(next: boolean) {
  if (next === enabled) return;
  enabled = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }
  emit();
}

export function toggleSiteSound() {
  setSiteSoundEnabled(!enabled);
}

function subscribe(onStoreChange: Listener) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/** Read the current on/off state reactively (e.g. to render a mute toggle). */
export function useSiteSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => enabled,
    () => true // server snapshot — matches the default so hydration never mismatches
  );
}
