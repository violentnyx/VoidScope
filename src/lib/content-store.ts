import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ContactContent, RowItem } from "@/content/types";

/**
 * Guarda só o que é editável pelo admin (identidade + logo da marca),
 * separado do resto do conteúdo estático em site-content.ts. Isso fica
 * num arquivo JSON simples — igual ao db.json do app do wishlist — o
 * que significa que, assim como aquele app, ISSO PRECISA DE DISCO
 * PERSISTENTE: funciona rodando num servidor sempre ligado (tipo o
 * Lightsail que já configuramos), mas NÃO funciona em hospedagem
 * serverless/edge (Vercel, Amplify SSR, etc.) sem trocar isso por um
 * banco de dados de verdade — lá o disco não persiste entre deploys.
 */

export interface RanksOverride {
  deadlock?: {
    steamAccountId?: string;
    steamId64?: string;
    steamId3?: string;
    steamProfileName?: string | null;
    steamAvatarUrl?: string | null;
    steamProfileUrl?: string | null;
    manualRankName?: string;
    manualRankImageSrc?: string | null;
  };
  overwatch?: {
    battleTag?: string;
    role?: "tank" | "damage" | "support";
    manualRankName?: string;
    manualRankImageSrc?: string | null;
  };
}

export interface ContentOverrides {
  identity?: {
    name?: string;
    tag?: string;
    bio?: string;
    avatarSrc?: string | null;
    avatarShape?: "square" | "rounded" | "circle";
    avatarBackgroundOpacity?: number;
    avatarFrameEnabled?: boolean;
    avatarFrameColor?: string;
    avatarFrameWidth?: number;
    socialLinksPosition?: "below-avatar" | "below-bio";
  };
  brand?: {
    name?: string;
    logoSrc?: string | null;
  };
  contact?: Partial<ContactContent>;
  socialMedia?: {
    heading?: string;
    items?: RowItem[];
  };
  integrations?: {
    twitchChannelLogin?: string;
    lastfmUsername?: string;
    ranks?: RanksOverride;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const OVERRIDES_PATH = path.join(DATA_DIR, "content-overrides.json");

export async function getOverrides(): Promise<ContentOverrides> {
  try {
    const raw = await readFile(OVERRIDES_PATH, "utf-8");
    return JSON.parse(raw) as ContentOverrides;
  } catch {
    // Arquivo ainda não existe (primeira vez) ou está inválido — trata
    // como "sem overrides", o site mostra o conteúdo padrão.
    return {};
  }
}

export async function saveOverrides(partial: ContentOverrides): Promise<ContentOverrides> {
  const current = await getOverrides();

  const merged: ContentOverrides = {
    identity: { ...current.identity, ...partial.identity },
    brand: { ...current.brand, ...partial.brand },
    contact: { ...current.contact, ...partial.contact },
    socialMedia: { ...current.socialMedia, ...partial.socialMedia },
    integrations: {
      ...current.integrations,
      ...partial.integrations,
      ranks: {
        deadlock: {
          ...current.integrations?.ranks?.deadlock,
          ...partial.integrations?.ranks?.deadlock,
        },
        overwatch: {
          ...current.integrations?.ranks?.overwatch,
          ...partial.integrations?.ranks?.overwatch,
        },
      },
    },
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OVERRIDES_PATH, JSON.stringify(merged, null, 2), "utf-8");

  return merged;
}
