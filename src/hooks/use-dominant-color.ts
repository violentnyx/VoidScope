"use client";

import { useEffect, useState } from "react";

const FALLBACK_COLOR = "rgb(163, 163, 163)"; // cinza neutro, usado enquanto extrai ou se falhar

/**
 * Extrai uma cor "vibrante" predominante de uma imagem (capa de album),
 * pra usar como cor tema (ex: preencher a barra de progresso).
 *
 * Faz tudo no cliente via canvas — desenha a imagem bem pequena (downscale
 * pra ~24x24) e agrupa os pixels por bucket de cor, ignorando tons quase
 * pretos/brancos/cinzas (que normalmente sao fundo, nao a cor "da capa").
 * Precisa que a imagem sirva CORS (a CDN da Spotify/Last.fm serve).
 */
export function useDominantColor(imageUrl: string | null | undefined): string {
  const [color, setColor] = useState(FALLBACK_COLOR);

  useEffect(() => {
    if (!imageUrl) {
      setColor(FALLBACK_COLOR);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];
          if (alpha < 200) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          // Ignora quase-preto, quase-branco e cinza sem graca (baixa saturacao).
          if (max < 30 || min > 225 || saturation < 0.15) continue;

          // Agrupa em buckets de 24 pra achar a cor mais comum entre as "vibrantes".
          const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
          const bucket = buckets.get(key);
          if (bucket) {
            bucket.count += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
          } else {
            buckets.set(key, { count: 1, r, g, b });
          }
        }

        let best: { count: number; r: number; g: number; b: number } | null = null;
        for (const bucket of buckets.values()) {
          if (!best || bucket.count > best.count) best = bucket;
        }

        if (best) {
          const r = Math.round(best.r / best.count);
          const g = Math.round(best.g / best.count);
          const b = Math.round(best.b / best.count);
          if (!cancelled) setColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch {
        // Canvas "tainted" (sem CORS) ou outro erro — mantem a cor neutra.
      }
    };

    img.onerror = () => {
      if (!cancelled) setColor(FALLBACK_COLOR);
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}
