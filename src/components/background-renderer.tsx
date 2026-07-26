"use client";

import { ShaderBackground } from "@/components/shader-background";
import { useSiteTheme } from "@/components/theme-provider";

export function BackgroundRenderer() {
  const { background } = useSiteTheme();

  return (
    <ShaderBackground
      targetFps={background.shader.targetFps}
      resolutionScale={background.shader.resolutionScale}
      videoSrc={background.video.src}
      videoPoster={background.video.poster}
    />
  );
}
