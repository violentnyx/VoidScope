import { NextRequest, NextResponse } from "next/server";
import { getOverrides, saveOverrides, type ContentOverrides } from "@/lib/content-store";
import { getContent } from "@/lib/get-content";
import { getSteamProfile } from "@/lib/steam";

// GET: devolve o conteúdo já mesclado (padrão + overrides), pra
// pré-preencher o formulário do admin com os valores atuais.
export async function GET() {
  const [content, overrides] = await Promise.all([getContent(), getOverrides()]);
  const deadlock = content.home.ranksWidget.games.find((g) => g.source === "deadlock-api");
  const overwatch = content.home.ranksWidget.games.find((g) => g.source === "overfast-api");
  const steam = overrides.integrations?.ranks?.deadlock;
  const liveSteam = steam?.steamId64
    ? await getSteamProfile(steam.steamId64).catch(() => null)
    : null;

  return NextResponse.json({
    identity: content.home.identity,
    brand: content.brand,
    contact: content.contact,
    socialMedia: {
      heading: content.home.otherSocials.heading,
      items: content.home.otherSocials.items,
    },
    integrations: {
      twitchChannelLogin: content.home.twitchLive.channelLogin,
      lastfmUsername: content.home.nowPlayingWidget.lastfmUsername,
      ranks: {
        deadlock: {
          steamAccountId: deadlock?.steamAccountId ?? "",
          steamId64: steam?.steamId64 ?? "",
          steamId3: steam?.steamId3 ?? "",
          steamProfileName: liveSteam?.personaName ?? steam?.steamProfileName ?? null,
          steamAvatarUrl: liveSteam?.avatarUrl ?? steam?.steamAvatarUrl ?? null,
          steamProfileUrl: liveSteam?.profileUrl ?? steam?.steamProfileUrl ?? null,
          manualRankName: deadlock?.manualFallback.rankName ?? "",
          manualRankImageSrc: deadlock?.manualFallback.rankImageSrc ?? null,
        },
        overwatch: {
          battleTag: overwatch?.battleTag ?? "",
          role: overwatch?.overwatchRole ?? "damage",
          manualRankName: overwatch?.manualFallback.rankName ?? "",
          manualRankImageSrc: overwatch?.manualFallback.rankImageSrc ?? null,
        },
      },
    },
  });
}

// POST: recebe só os campos que o formulário permite editar e grava
// como override. Validação bem simples de propósito — é um painel de
// admin pessoal, não um formulário público.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const partial: ContentOverrides = {};

  if (typeof input.identity === "object" && input.identity !== null) {
    const identity = input.identity as Record<string, unknown>;
    partial.identity = {};
    if (typeof identity.name === "string") partial.identity.name = identity.name.slice(0, 80);
    if (typeof identity.tag === "string") partial.identity.tag = identity.tag.slice(0, 40);
    if (typeof identity.bio === "string") partial.identity.bio = identity.bio.slice(0, 400);
    if (typeof identity.avatarSrc === "string" || identity.avatarSrc === null) {
      partial.identity.avatarSrc = identity.avatarSrc as string | null;
    }
  }

  if (typeof input.brand === "object" && input.brand !== null) {
    const brand = input.brand as Record<string, unknown>;
    partial.brand = {};
    if (typeof brand.name === "string") partial.brand.name = brand.name.slice(0, 60);
    if (typeof brand.logoSrc === "string" || brand.logoSrc === null) {
      partial.brand.logoSrc = brand.logoSrc as string | null;
    }
  }

  if (typeof input.contact === "object" && input.contact !== null) {
    const contact = input.contact as Record<string, unknown>;
    partial.contact = {};
    if (typeof contact.lead === "string") partial.contact.lead = contact.lead.slice(0, 500);
    if (typeof contact.email === "string") partial.contact.email = contact.email.trim().slice(0, 160);
    if (typeof contact.emailCtaLabel === "string") partial.contact.emailCtaLabel = contact.emailCtaLabel.slice(0, 60);
    if (Array.isArray(contact.otherContacts)) {
      partial.contact.otherContacts = contact.otherContacts.slice(0, 30).flatMap((raw) => {
        if (typeof raw !== "object" || raw === null) return [];
        const item = raw as Record<string, unknown>;
        if (typeof item.title !== "string") return [];
        return [{ title: item.title.slice(0, 80), href: typeof item.href === "string" ? item.href.slice(0, 500) : "" }];
      });
    }
  }

  if (typeof input.socialMedia === "object" && input.socialMedia !== null) {
    const social = input.socialMedia as Record<string, unknown>;
    partial.socialMedia = {};
    if (typeof social.heading === "string") partial.socialMedia.heading = social.heading.slice(0, 80);
    if (Array.isArray(social.items)) {
      partial.socialMedia.items = social.items.slice(0, 50).flatMap((raw) => {
        if (typeof raw !== "object" || raw === null) return [];
        const item = raw as Record<string, unknown>;
        if (typeof item.title !== "string") return [];
        return [{ title: item.title.slice(0, 80), href: typeof item.href === "string" ? item.href.slice(0, 500) : "" }];
      });
    }
  }

  if (typeof input.integrations === "object" && input.integrations !== null) {
    const integrations = input.integrations as Record<string, unknown>;
    partial.integrations = {};

    if (typeof integrations.twitchChannelLogin === "string") {
      partial.integrations.twitchChannelLogin = integrations.twitchChannelLogin.trim().slice(0, 60);
    }
    if (typeof integrations.lastfmUsername === "string") {
      partial.integrations.lastfmUsername = integrations.lastfmUsername.trim().slice(0, 60);
    }

    if (typeof integrations.ranks === "object" && integrations.ranks !== null) {
      const ranks = integrations.ranks as Record<string, unknown>;
      partial.integrations.ranks = {};

      if (typeof ranks.deadlock === "object" && ranks.deadlock !== null) {
        const deadlock = ranks.deadlock as Record<string, unknown>;
        partial.integrations.ranks.deadlock = {};
        if (typeof deadlock.steamAccountId === "string") {
          partial.integrations.ranks.deadlock.steamAccountId = deadlock.steamAccountId.trim().slice(0, 40);
        }
        if (typeof deadlock.manualRankName === "string") {
          partial.integrations.ranks.deadlock.manualRankName = deadlock.manualRankName.slice(0, 40);
        }
        if (typeof deadlock.manualRankImageSrc === "string" || deadlock.manualRankImageSrc === null) {
          partial.integrations.ranks.deadlock.manualRankImageSrc = deadlock.manualRankImageSrc as string | null;
        }
      }

      if (typeof ranks.overwatch === "object" && ranks.overwatch !== null) {
        const overwatch = ranks.overwatch as Record<string, unknown>;
        partial.integrations.ranks.overwatch = {};
        if (typeof overwatch.battleTag === "string") {
          partial.integrations.ranks.overwatch.battleTag = overwatch.battleTag.trim().slice(0, 40);
        }
        if (overwatch.role === "tank" || overwatch.role === "damage" || overwatch.role === "support") {
          partial.integrations.ranks.overwatch.role = overwatch.role;
        }
        if (typeof overwatch.manualRankName === "string") {
          partial.integrations.ranks.overwatch.manualRankName = overwatch.manualRankName.slice(0, 40);
        }
        if (typeof overwatch.manualRankImageSrc === "string" || overwatch.manualRankImageSrc === null) {
          partial.integrations.ranks.overwatch.manualRankImageSrc = overwatch.manualRankImageSrc as string | null;
        }
      }
    }
  }

  const saved = await saveOverrides(partial);
  return NextResponse.json({ ok: true, overrides: saved });
}
