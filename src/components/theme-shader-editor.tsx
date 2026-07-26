"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BackgroundMode } from "@/themes/theme-types";
import { playUISound } from "@/lib/site-sounds";

type ThemeSettingsResponse = {
  background: {
    mode: BackgroundMode;
    shaderCode: string;
    targetFps: number;
    resolutionScale: number;
    videoEnabled: boolean;
    videoSrc: string;
    videoPoster?: string;
  };
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function ThemeShaderEditor() {
  const router = useRouter();
  const [settings, setSettings] = useState<ThemeSettingsResponse["background"] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/theme")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "Falha ao carregar tema.");
        return data as ThemeSettingsResponse;
      })
      .then((data) => setSettings(data.background))
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Falha ao carregar tema."));
  }, []);

  function patch(next: Partial<ThemeSettingsResponse["background"]>) {
    setSettings((current) => current ? { ...current, ...next } : current);
    setSaveState("idle");
    setMessage(null);
  }

  async function save() {
    if (!settings) return;
    setSaveState("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: settings }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Falha ao salvar o tema.");
      setSaveState("saved");
      setMessage("Export validado e aplicado pelo renderer oficial do Shader Lab.");
      playUISound("save");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Não consegui salvar o shader.");
      playUISound("error");
    }
  }

  if (loadError) return <p className="text-sm text-red-400">{loadError}</p>;
  if (!settings) return <p className="text-sm text-white/50">Carregando configuração do tema…</p>;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Fundo e Shader Lab</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/50">
          Cole o arquivo inteiro exportado pelo Shader Lab, desde o <code className="text-white/70">import</code>
          até <code className="ml-1 text-white/70">ExportedShader</code>, ou somente o objeto <code className="text-white/70">config</code>.
          O servidor extrai apenas a variável <code className="text-white/70">config</code> e não executa o JSX colado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-white/60">
          Modo
          <select
            value={settings.mode}
            onChange={(event) => patch({ mode: event.target.value as BackgroundMode })}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
          >
            <option value="auto">Automático</option>
            <option value="shader">Shader</option>
            <option value="video">Vídeo</option>
            <option value="css">CSS</option>
          </select>
        </label>

        <label className="text-xs text-white/60">
          FPS do shader
          <input
            type="number"
            min={5}
            max={60}
            value={settings.targetFps}
            onChange={(event) => patch({ targetFps: Number(event.target.value) })}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="text-xs text-white/60">
          Escala de resolução
          <input
            type="number"
            min={0.25}
            max={1}
            step={0.05}
            value={settings.resolutionScale}
            onChange={(event) => patch({ resolutionScale: Number(event.target.value) })}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <label className="block text-xs text-white/60">
        Código da composição
        <textarea
          value={settings.shaderCode}
          onChange={(event) => patch({ shaderCode: event.target.value })}
          spellCheck={false}
          rows={22}
          className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-[#08080a] p-3 font-mono text-xs leading-relaxed text-white outline-none focus:border-white/35"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/60">
          URL do vídeo de fallback
          <input
            type="text"
            value={settings.videoSrc}
            onChange={(event) => patch({ videoSrc: event.target.value })}
            placeholder="/video/shader-background-fallback.mp4"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/60">
          URL do poster, opcional
          <input
            type="text"
            value={settings.videoPoster ?? ""}
            onChange={(event) => patch({ videoPoster: event.target.value })}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={settings.videoEnabled}
          onChange={(event) => patch({ videoEnabled: event.target.checked })}
        />
        Usar vídeo como fallback quando o shader falhar
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-85 disabled:opacity-40"
        >
          {saveState === "saving" ? "Validando e salvando…" : "Salvar shader"}
        </button>
        {message && (
          <span className={saveState === "error" ? "text-xs text-red-400" : "text-xs text-emerald-300"}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
