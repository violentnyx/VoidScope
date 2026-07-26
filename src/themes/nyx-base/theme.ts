import type { SiteTheme } from "../theme-types";

export const nyxBaseTheme: SiteTheme = {
  id: "nyx-base",
  name: "Nyx Base",
  background: {
    mode: "auto",
    shader: {
      enabled: true,
      targetFps: 30,
      resolutionScale: 0.75,
      disableOnReducedMotion: true,
      disableOnSaveData: true,
    },
    video: {
      enabled: true,
      src: "/video/shader-background-fallback.mp4",
    },
  },
};
