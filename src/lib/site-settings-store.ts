import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Guarda o estado de "Páginas" (ativo/staging) e "Seções da Home"
 * (ligado/desligado) que o painel Admin controla — mesmo padrão de
 * disco persistente do content-store.ts (data/*.json), então também
 * precisa de disco persistente entre deploys (funciona no Lightsail,
 * não em serverless/edge sem trocar por um banco de verdade).
 */

export type PageStatus = "ativo" | "staging";

export interface SiteSettings {
  introEnabled?: boolean;
  pages?: Record<string, PageStatus>;
  sections?: Record<string, boolean>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_PATH = path.join(DATA_DIR, "site-settings.json");

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw) as SiteSettings;
  } catch {
    // Arquivo ainda não existe (nada foi salvo ainda) ou está inválido.
    return {};
  }
}

export async function saveSiteSettings(partial: SiteSettings): Promise<SiteSettings> {
  const current = await getSiteSettings();

  const merged: SiteSettings = {
    introEnabled: partial.introEnabled ?? current.introEnabled,
    pages: { ...current.pages, ...partial.pages },
    sections: { ...current.sections, ...partial.sections },
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8");

  return merged;
}
