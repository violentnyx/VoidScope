import type { ShaderLabConfig } from "@basementstudio/shader-lab";

export type BackgroundMode = "auto" | "shader" | "video" | "css";

export type ThemeBackgroundConfig = {
  mode: BackgroundMode;
  shader: {
    enabled: boolean;
    targetFps: number;
    resolutionScale: number;
    disableOnReducedMotion: boolean;
    disableOnSaveData: boolean;
    config?: ShaderLabConfig;
  };
  video: {
    enabled: boolean;
    src: string;
    poster?: string;
  };
};

export type SiteTheme = {
  id: string;
  name: string;
  background: ThemeBackgroundConfig;
};
