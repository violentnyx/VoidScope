import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSON5 from "json5";
import type { ShaderLabConfig } from "@basementstudio/shader-lab";
import { nyxBaseTheme } from "@/themes/nyx-base/theme";
import type { BackgroundMode, SiteTheme } from "@/themes/theme-types";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_PATH = path.join(DATA_DIR, "theme-settings.json");

export type StoredThemeSettings = {
  themeId: string;
  background: {
    mode: BackgroundMode;
    shaderCode: string;
    shaderConfig: ShaderLabConfig;
    targetFps: number;
    resolutionScale: number;
    videoEnabled: boolean;
    videoSrc: string;
    videoPoster?: string;
  };
};

export const DEFAULT_SHADER_CODE = String.raw`{
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
}`;

function findObjectLiteral(source: string): string {
  if (!source.trim()) throw new Error("Cole o código exportado pelo Shader Lab.");

  // Prefer the variable emitted by Shader Lab exports. Supporting both
  // `config` and the older `shaderConfig` keeps previous saved snippets valid.
  const assignment = /\b(?:const|let|var)\s+(?:config|shaderConfig)\s*(?::[^=;]+)?\s*=\s*/m.exec(source);
  const startSearch = assignment ? assignment.index + assignment[0].length : 0;
  const start = source.indexOf("{", startSearch);
  if (start < 0) throw new Error("Não encontrei o objeto `config` exportado pelo Shader Lab.");

  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  throw new Error("O objeto `config` não foi fechado corretamente.");
}

export function parseShaderCode(source: string): ShaderLabConfig {
  if (source.length > 250_000) throw new Error("O código do shader excede 250 KB.");
  const literal = findObjectLiteral(source);
  const parsed = JSON5.parse(literal) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("Configuração inválida.");
  const config = parsed as Record<string, unknown>;
  if (!Array.isArray(config.layers)) throw new Error("A configuração precisa conter um array layers.");
  if (!config.timeline || typeof config.timeline !== "object") {
    throw new Error("A configuração precisa conter timeline.");
  }
  return parsed as ShaderLabConfig;
}

export async function getThemeSettings(): Promise<StoredThemeSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    const stored = JSON.parse(raw) as StoredThemeSettings;
    return stored;
  } catch {
    const shaderCode = DEFAULT_SHADER_CODE;
    return {
      themeId: nyxBaseTheme.id,
      background: {
        mode: nyxBaseTheme.background.mode,
        shaderCode,
        shaderConfig: parseShaderCode(shaderCode),
        targetFps: nyxBaseTheme.background.shader.targetFps,
        resolutionScale: nyxBaseTheme.background.shader.resolutionScale,
        videoEnabled: nyxBaseTheme.background.video.enabled,
        videoSrc: nyxBaseTheme.background.video.src,
        videoPoster: nyxBaseTheme.background.video.poster,
      },
    };
  }
}

export async function saveThemeSettings(input: StoredThemeSettings): Promise<StoredThemeSettings> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(input, null, 2), "utf8");
  return input;
}

export async function getConfiguredTheme(): Promise<SiteTheme> {
  const stored = await getThemeSettings();
  return {
    ...nyxBaseTheme,
    id: stored.themeId || nyxBaseTheme.id,
    background: {
      ...nyxBaseTheme.background,
      mode: stored.background.mode,
      shader: {
        ...nyxBaseTheme.background.shader,
        targetFps: stored.background.targetFps,
        resolutionScale: stored.background.resolutionScale,
        config: stored.background.shaderConfig,
      },
      video: {
        ...nyxBaseTheme.background.video,
        enabled: stored.background.videoEnabled,
        src: stored.background.videoSrc,
        poster: stored.background.videoPoster,
      },
    },
  };
}
