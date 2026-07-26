"use client";

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useShaderLabCanvasSource,
  type ShaderLabConfig,
} from "@basementstudio/shader-lab";

/**
 * Exported straight from Shader Lab. If you tweak the composition,
 * paste the updated `config` object back in here — nothing else in
 * the app needs to change.
 */
const shaderConfig: ShaderLabConfig = {
  layers: [
    {
      blendMode: "normal",
      compositeMode: "filter",
      maskConfig: {
        invert: false,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "bd5d0b14-be91-4d83-bd2c-6a017430aa2a",
      kind: "effect",
      name: "CRT",
      opacity: 0.31,
      params: {
        crtMode: "slot-mask",
        cellSize: 3,
        scanlineIntensity: 0.17,
        maskIntensity: 1,
        barrelDistortion: 0.15,
        chromaticAberration: 2,
        beamFocus: 0.58,
        brightness: 1.2,
        highlightDrive: 1,
        highlightThreshold: 0.62,
        shoulder: 0.25,
        chromaRetention: 1.15,
        shadowLift: 0.16,
        persistence: 0.18,
        vignetteIntensity: 0.45,
        flickerIntensity: 0.2,
        glitchIntensity: 0.13,
        glitchSpeed: 5,
        signalArtifacts: 0.45,
        bloomEnabled: true,
        bloomIntensity: 1.93,
        bloomThreshold: 0,
        bloomRadius: 8,
        bloomSoftness: 0.31,
      },
      saturation: 1,
      type: "crt",
      visible: true,
    },
    {
      blendMode: "normal",
      compositeMode: "filter",
      maskConfig: {
        invert: true,
        mode: "multiply",
        source: "luminance",
      },
      hue: 0,
      id: "09a49c60-4b26-4bc9-851c-3020260c1ab4",
      kind: "source",
      name: "Gradient",
      opacity: 1,
      params: {
        preset: "deep-ocean",
        activePoints: 4,
        point1Color: "#A81010",
        point1Position: [1.21, 1.35],
        point1Weight: 0.8,
        point2Color: "#C3000E",
        point2Position: [-0.74, -1.19],
        point2Weight: 1.2,
        point3Color: "#190404",
        point3Position: [-1.02, 1.37],
        point3Weight: 1.02,
        point4Color: "#420C0C",
        point4Position: [0.3600000000000001, 0.6200000000000001],
        point4Weight: 0.71,
        point5Color: "#234986",
        point5Position: [-0.02, 0.2],
        point5Weight: 1.59,
        noiseType: "ridge",
        noiseSeed: 23,
        warpAmount: 0.12,
        warpScale: 2.43,
        warpIterations: 2,
        warpDecay: 1.26,
        warpBias: 0.49,
        vortexAmount: 0.3,
        animate: true,
        motionAmount: 0.54,
        motionSpeed: 0.26,
        falloff: 3.5,
        tonemapMode: "reinhard",
        glowStrength: 0,
        glowThreshold: 0,
        grainAmount: 0,
        vignetteStrength: 0,
        vignetteRadius: 0,
        vignetteSoftness: 0.01,
      },
      saturation: 1,
      type: "gradient",
      visible: true,
    },
  ],
  timeline: {
    duration: 8,
    loop: true,
    tracks: [],
  },
};

/**
 * Performance knobs. Tweak these defaults instead of touching the
 * render logic below.
 *
 * - TARGET_FPS caps how often the composition is actually advanced.
 *   The runtime still lives inside a requestAnimationFrame loop (so
 *   it stays in sync with the display), but frames are skipped until
 *   1000 / TARGET_FPS ms have elapsed, which caps GPU work on displays
 *   with a high refresh rate.
 * - RESOLUTION_SCALE controls the internal render resolution as a
 *   fraction of the element's on-screen (CSS) size. The output canvas
 *   is then stretched to 100% via CSS, so it still fills the screen —
 *   it's just composited/shaded at a lower pixel count, which is
 *   usually the biggest perf win for a full-bleed background.
 * - MAX_DEVICE_PIXEL_RATIO caps how much retina/4K displays multiply
 *   the resolution further.
 */
const DEFAULT_TARGET_FPS = 30;
const DEFAULT_RESOLUTION_SCALE = 0.75;
const MAX_DEVICE_PIXEL_RATIO = 1.5;
const MIN_RESOLUTION_SCALE = 0.25;
const MAX_RESOLUTION_SCALE = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** True only in a browser that exposes the WebGPU entry point. */
function supportsWebGPU() {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/**
 * Static CSS approximation of the Shader Lab gradient. This is the
 * last-resort fallback: shown when WebGPU is unavailable and the
 * video fallback below either wasn't provided or also failed to
 * load. Colors are pulled straight from the gradient layer above so
 * it still feels like the same background.
 */
function ShaderFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(120% 90% at 80% 15%, #A81010 0%, transparent 45%), " +
          "radial-gradient(100% 90% at 5% 90%, #C3000E 0%, transparent 50%), " +
          "radial-gradient(90% 80% at 40% 55%, #234986 0%, transparent 55%), " +
          "radial-gradient(120% 100% at 20% 100%, #420C0C 0%, transparent 60%), " +
          "#190404",
      }}
    />
  );
}

/**
 * Video fallback, used when the browser has no WebGPU support at
 * all (older Safari, some mobile browsers). Drop a looping clip at
 * `videoSrc` (defaults to /video/shader-background-fallback.mp4) —
 * if that file is missing or fails to decode, `onError` fires and we
 * drop down one more level to the CSS gradient.
 */
function VideoFallback({
  src,
  poster,
  onError,
}: {
  src: string;
  poster?: string;
  onError: () => void;
}) {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      onError={onError}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

/**
 * Catches render/runtime errors thrown by the Shader Lab canvas
 * source (e.g. a WebGPU adapter request rejecting despite
 * `navigator.gpu` being present) and reports them upward instead of
 * taking down the page.
 */
class ShaderErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface ShaderCanvasProps {
  targetFps: number;
  resolutionScale: number;
  onFail: () => void;
}

/**
 * Renders the composition via the low-level `useShaderLabCanvasSource`
 * API instead of `<ShaderLabComposition />`. That trades a bit of
 * convenience for two things `ShaderLabComposition` doesn't expose:
 * manual control over how often the composition advances (fps) and
 * over the internal render size (resolution), independent of the
 * element's on-screen CSS size.
 */
function ShaderCanvas({ targetFps, resolutionScale, onFail }: ShaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });

  // Track the element's on-screen size so we know what to scale down from.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const renderWidth = Math.max(1, Math.round(containerSize.width * resolutionScale));
  const renderHeight = Math.max(1, Math.round(containerSize.height * resolutionScale));

  // If this throws synchronously (e.g. the WebGPU adapter request
  // rejects despite `navigator.gpu` being present), the render error
  // propagates up to <ShaderErrorBoundary> around this component,
  // which is what actually flips us over to the video fallback.
  const { canvas, ready, resize, update } = useShaderLabCanvasSource(shaderConfig, {
    width: renderWidth,
    height: renderHeight,
  });

  // Mount the runtime's own <canvas> into our container and stretch it
  // to fill via CSS — the backing store stays at renderWidth/Height
  // regardless of the element's displayed size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !canvas) return;

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    el.appendChild(canvas);

    return () => {
      if (canvas.parentElement === el) {
        el.removeChild(canvas);
      }
    };
  }, [canvas]);

  // Keep the runtime's internal render target in sync with container
  // size / resolution scale changes.
  useEffect(() => {
    if (!ready) return;
    resize(renderWidth, renderHeight);
  }, [ready, renderWidth, renderHeight, resize]);

  // Keep the latest `update`/`onFail` in refs so the rAF loop effect
  // below only ever restarts on `ready`/`targetFps` changes — not on
  // every render — even if the hook returns a new function identity
  // each time. Restarting the loop on every render would reset
  // `elapsedSeconds` and cause a visible stutter on every resize.
  const updateRef = useRef(update);
  updateRef.current = update;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  // Manual rAF loop, throttled to targetFps. We still tick every
  // frame (so we stay in step with the display and can measure real
  // elapsed time), but only call `update()` — which is what actually
  // re-renders the composition — once the frame budget has elapsed.
  useEffect(() => {
    if (!ready) return;

    let rafId = 0;
    let lastTime = performance.now();
    let elapsedSeconds = 0;
    let accumulatorMs = 0;
    const frameIntervalMs = 1000 / Math.max(1, targetFps);
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      rafId = requestAnimationFrame(tick);

      const rawDeltaMs = now - lastTime;
      lastTime = now;
      accumulatorMs += rawDeltaMs;
      if (accumulatorMs < frameIntervalMs) return;

      const deltaSeconds = accumulatorMs / 1000;
      accumulatorMs = 0;
      elapsedSeconds += deltaSeconds;

      try {
        updateRef.current(elapsedSeconds, deltaSeconds);
      } catch {
        cancelled = true;
        cancelAnimationFrame(rafId);
        onFailRef.current();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [ready, targetFps]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

type BackgroundMode = "css" | "shader" | "video";

export interface ShaderBackgroundProps {
  /** How often the composition is advanced. Lower = cheaper. Default 30. */
  targetFps?: number;
  /** Internal render resolution as a fraction (0.25–1) of the on-screen size. Default 0.75. */
  resolutionScale?: number;
  /** Looping video shown when WebGPU isn't available. */
  videoSrc?: string;
  /** Poster frame for the video fallback. */
  videoPoster?: string;
}

export function ShaderBackground({
  targetFps = DEFAULT_TARGET_FPS,
  resolutionScale = DEFAULT_RESOLUTION_SCALE,
  videoSrc = "/video/shader-background-fallback.mp4",
  videoPoster,
}: ShaderBackgroundProps = {}) {
  // Start on the cheap CSS fallback for the very first paint so the
  // server-rendered markup and the client's first render always
  // match (checking `navigator.gpu` can only happen client-side).
  // We flip to the real mode right after mount.
  const [mode, setMode] = useState<BackgroundMode>("css");

  useEffect(() => {
    setMode(supportsWebGPU() ? "shader" : "video");
  }, []);

  const clampedResolutionScale = useMemo(
    () => clamp(resolutionScale, MIN_RESOLUTION_SCALE, MAX_RESOLUTION_SCALE),
    [resolutionScale]
  );

  const clampedPixelRatioHint = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-black"
    >
      {mode === "shader" && (
        <ShaderErrorBoundary onError={() => setMode("video")}>
          <ShaderCanvas
            targetFps={targetFps}
            // Roll the capped device pixel ratio into the resolution
            // scale so 4K/retina screens don't quietly undo the perf
            // budget set by `resolutionScale`.
            resolutionScale={clampedResolutionScale * clampedPixelRatioHint}
            onFail={() => setMode("video")}
          />
        </ShaderErrorBoundary>
      )}
      {mode === "video" && (
        <VideoFallback
          src={videoSrc}
          poster={videoPoster}
          onError={() => setMode("css")}
        />
      )}
      {mode === "css" && <ShaderFallback />}
    </div>
  );
}
