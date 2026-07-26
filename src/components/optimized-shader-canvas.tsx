"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useShaderLabCanvasSource, type ShaderLabConfig } from "@basementstudio/shader-lab";

// Caps how many device pixels we ask the GPU to shade. A full
// CRT + bloom + chromatic-aberration composition at native 3x retina
// resolution redraws every effect ~9x more pixels than at 1x — most
// of that is invisible on a background shader.
const MAX_PIXEL_RATIO = 1.5;
// Caps the internal render resolution outright, regardless of how
// large the viewport or pixel ratio is.
const MAX_DIMENSION = 1600;
// Caps the update rate instead of letting requestAnimationFrame drive
// it at the display's native refresh rate (60/120/144hz). A slow CRT
// + gradient background doesn't need more than this to read as smooth.
const DEFAULT_TARGET_FPS = 30;
// If the runtime never reports ready within this window, treat it as
// a failed init (no WebGPU, shader compile error, etc.) and fall back.
// This hook has no onRuntimeError like <ShaderLabComposition/>, so
// this is our best approximation of the same behavior.
const READY_TIMEOUT_MS = 4000;

interface OptimizedShaderCanvasProps {
  config: ShaderLabConfig;
  fallback: ReactNode;
  targetFps?: number;
  className?: string;
}

/**
 * Same visual output as <ShaderLabComposition/>, but renders at a
 * capped resolution and a capped, manually-driven frame rate instead
 * of full devicePixelRatio at the display's native refresh rate.
 * Falls back to `fallback` if WebGPU isn't available or init doesn't
 * complete in time.
 *
 * NOTE: this hasn't been run against a live browser yet (no dev
 * server in the environment this was written in) — test locally
 * before relying on it.
 */
export function OptimizedShaderCanvas({
  config,
  fallback,
  targetFps = DEFAULT_TARGET_FPS,
  className,
}: OptimizedShaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);

  // Bail out immediately if the browser has no WebGPU at all, rather
  // than letting the hook attempt (and possibly fail silently at) init.
  useEffect(() => {
    if (typeof navigator !== "undefined" && !("gpu" in navigator)) {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const w = Math.min(Math.round(width * pixelRatio), MAX_DIMENSION);
      const h = Math.min(Math.round(height * pixelRatio), MAX_DIMENSION);
      setSize({ width: Math.max(w, 1), height: Math.max(h, 1) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { canvas, ready, resize, update } = useShaderLabCanvasSource(config, {
    width: size?.width ?? 1,
    height: size?.height ?? 1,
  });

  // The hook hands us a raw canvas instead of rendering anything
  // itself — we're responsible for placing it in the DOM.
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl || !canvas) return;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mountEl.appendChild(canvas);
    return () => {
      if (mountEl.contains(canvas)) mountEl.removeChild(canvas);
    };
  }, [canvas]);

  useEffect(() => {
    if (!size) return;
    resize(size.width, size.height);
  }, [resize, size]);

  // Approximates onRuntimeError: if init hasn't completed in time,
  // assume it failed and switch to the static fallback.
  useEffect(() => {
    if (ready || failed) return;
    const timer = setTimeout(() => setFailed(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, failed]);

  // Manual, FPS-capped render loop. requestAnimationFrame already
  // stops firing on its own in a backgrounded tab, so this doesn't
  // need its own visibility check — the parent components
  // (ShaderBackground / MaintenanceShaderBackground) already decide
  // whether to mount this at all.
  useEffect(() => {
    if (!ready) return;

    const frameIntervalMs = 1000 / targetFps;
    let raf = 0;
    let start: number | null = null;
    let lastFrameTime = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (start === null) start = now;
      if (now - lastFrameTime < frameIntervalMs) return;
      const elapsed = (now - start) / 1000;
      const delta = (lastFrameTime === 0 ? 0 : now - lastFrameTime) / 1000;
      lastFrameTime = now;
      update(elapsed, delta);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, update, targetFps]);

  const showFallback = failed || !size;

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }}>
      {!showFallback && <div ref={mountRef} style={{ width: "100%", height: "100%" }} />}
      {showFallback && fallback}
    </div>
  );
}
