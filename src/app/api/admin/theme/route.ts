import { NextRequest, NextResponse } from "next/server";
import {
  getThemeSettings,
  parseShaderCode,
  saveThemeSettings,
  type StoredThemeSettings,
} from "@/lib/theme-settings-store";
import type { BackgroundMode } from "@/themes/theme-types";

export async function GET() {
  return NextResponse.json(await getThemeSettings());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const background = body.background as Record<string, unknown> | undefined;
    if (!background) return NextResponse.json({ error: "Configuração ausente." }, { status: 400 });

    const mode = background.mode;
    if (mode !== "auto" && mode !== "shader" && mode !== "video" && mode !== "css") {
      return NextResponse.json({ error: "Modo de fundo inválido." }, { status: 400 });
    }

    const shaderCode = typeof background.shaderCode === "string" ? background.shaderCode : "";
    const shaderConfig = parseShaderCode(shaderCode);
    const targetFps = Math.min(60, Math.max(5, Number(background.targetFps) || 30));
    const resolutionScale = Math.min(1, Math.max(0.25, Number(background.resolutionScale) || 0.75));
    const videoSrc = typeof background.videoSrc === "string" ? background.videoSrc.trim().slice(0, 1000) : "";
    const videoPoster = typeof background.videoPoster === "string" ? background.videoPoster.trim().slice(0, 1000) : undefined;

    const settings: StoredThemeSettings = {
      themeId: "nyx-base",
      background: {
        mode: mode as BackgroundMode,
        shaderCode,
        shaderConfig,
        targetFps,
        resolutionScale,
        videoEnabled: Boolean(background.videoEnabled),
        videoSrc,
        videoPoster,
      },
    };

    await saveThemeSettings(settings);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível salvar o shader." },
      { status: 400 },
    );
  }
}
