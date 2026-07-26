import { siteContent } from "@/content/site-content";
import { getOverrides } from "@/lib/content-store";
import { getSiteSettings, type PageStatus } from "@/lib/site-settings-store";
import { KNOWN_PAGE_IDS, PAGE_ROUTES, type PageId } from "@/lib/page-ids";
import { persistentUploadUrl } from "@/lib/uploaded-assets";
import type {
  ContactContent,
  HomeContent,
  ListPageContent,
  SiteContent,
} from "@/content/types";

export { KNOWN_PAGE_IDS, PAGE_ROUTES, type PageId };

/**
 * Single entry point every page/component uses to read site copy.
 *
 * Base copy comes from `content/site-content.ts`. On top of that, we
 * merge:
 *  - o que o painel Admin salvou em `data/content-overrides.json` (via
 *    src/lib/content-store.ts) — identidade (nome, tag, bio, avatar) e
 *    a logo da marca;
 *  - os liga/desliga de "Seções da Home" salvos em
 *    `data/site-settings.json` (via src/lib/site-settings-store.ts).
 * Nenhum componente precisa saber disso, porque nenhum deles importa
 * `site-content.ts` diretamente — todos já checam `content.enabled`
 * pra decidir se renderizam ou não.
 *
 * It's `async` on purpose, even though it was synchronous before, so
 * future changes to the data source don't change any call site.
 */
export async function getContent(): Promise<SiteContent> {
  const overrides = await getOverrides();
  const settings = await getSiteSettings();
  const sections = settings.sections ?? {};
  const integrations = overrides.integrations ?? {};
  const ranksOverride = integrations.ranks ?? {};

  return {
    ...siteContent,
    brand: {
      ...siteContent.brand,
      ...overrides.brand,
      logoSrc: persistentUploadUrl(overrides.brand?.logoSrc ?? siteContent.brand.logoSrc),
    },
    contact: {
      ...siteContent.contact,
      ...overrides.contact,
      otherContacts: overrides.contact?.otherContacts ?? siteContent.contact.otherContacts,
    },
    home: {
      ...siteContent.home,
      profileSocialButtonsEnabled:
        sections.profileSocialButtons ??
        siteContent.home.profileSocialButtonsEnabled,
      identity: {
        ...siteContent.home.identity,
        ...overrides.identity,
        avatarSrc: persistentUploadUrl(
          overrides.identity?.avatarSrc ?? siteContent.home.identity.avatarSrc,
        ),
      },
      twitchLive: {
        ...siteContent.home.twitchLive,
        enabled: sections.twitchLive ?? siteContent.home.twitchLive.enabled,
        channelLogin: integrations.twitchChannelLogin || siteContent.home.twitchLive.channelLogin,
      },
      latestVideo: {
        ...siteContent.home.latestVideo,
        enabled: sections.latestVideo ?? siteContent.home.latestVideo.enabled,
        channelIds:
          integrations.youtubeChannelIds ??
          siteContent.home.latestVideo.channelIds,
      },
      nowPlayingWidget: {
        ...siteContent.home.nowPlayingWidget,
        enabled: sections.nowPlayingWidget ?? siteContent.home.nowPlayingWidget.enabled,
        lastfmUsername: integrations.lastfmUsername || siteContent.home.nowPlayingWidget.lastfmUsername,
      },
      ranksWidget: {
        ...siteContent.home.ranksWidget,
        enabled: sections.ranksWidget ?? siteContent.home.ranksWidget.enabled,
        games: siteContent.home.ranksWidget.games.map((game) => {
          if (game.source === "deadlock-api") {
            const o = ranksOverride.deadlock;
            return {
              ...game,
              steamAccountId: o?.steamAccountId || game.steamAccountId,
              manualFallback: {
                rankName: o?.manualRankName || game.manualFallback.rankName,
                rankImageSrc:
                  o?.manualRankImageSrc !== undefined ? o.manualRankImageSrc : game.manualFallback.rankImageSrc,
              },
            };
          }
          if (game.source === "overfast-api") {
            const o = ranksOverride.overwatch;
            return {
              ...game,
              battleTag: o?.battleTag || game.battleTag,
              overwatchRole: o?.role || game.overwatchRole,
              manualFallback: {
                rankName: o?.manualRankName || game.manualFallback.rankName,
                rankImageSrc:
                  o?.manualRankImageSrc !== undefined ? o.manualRankImageSrc : game.manualFallback.rankImageSrc,
              },
            };
          }
          return game;
        }),
      },
      youtube: {
        ...siteContent.home.youtube,
        enabled: sections.youtube ?? siteContent.home.youtube.enabled,
      },
      tiktok: {
        ...siteContent.home.tiktok,
        enabled: sections.tiktok ?? siteContent.home.tiktok.enabled,
      },
      otherSocials: {
        ...siteContent.home.otherSocials,
        ...overrides.socialMedia,
        heading: overrides.socialMedia?.heading ?? "Contatos",
        items:
          overrides.contact?.otherContacts ??
          overrides.socialMedia?.items ??
          siteContent.contact.otherContacts,
        enabled: sections.otherSocials ?? siteContent.home.otherSocials.enabled,
      },
    },
  };
}

/**
 * Status (ativo/staging) de cada página, com "ativo" como padrão pra
 * quem ainda não foi salvo. Cada page.tsx chama isso pra decidir se
 * mostra o conteúdo normal ou a tela de manutenção — veja
 * src/lib/is-admin-request.ts pro outro lado da regra (admin logado
 * sempre vê o conteúdo normal, mesmo em staging).
 */
export async function getPagesStatus(): Promise<Record<PageId, PageStatus>> {
  const settings = await getSiteSettings();
  const result = {} as Record<PageId, PageStatus>;
  for (const id of KNOWN_PAGE_IDS) {
    result[id] = settings.pages?.[id] ?? "ativo";
  }
  return result;
}

export async function getHomeContent(): Promise<HomeContent> {
  const content = await getContent();
  return content.home;
}

export async function getProjectsContent(): Promise<ListPageContent> {
  const content = await getContent();
  return content.projects;
}

export async function getEquipmentContent(): Promise<ListPageContent> {
  const content = await getContent();
  return content.equipment;
}

export async function getContactContent(): Promise<ContactContent> {
  const content = await getContent();
  return content.contact;
}
