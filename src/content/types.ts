/**
 * Shared content types for the whole site.
 *
 * Every page/section reads its copy through `getContent()` (see
 * `src/lib/get-content.ts`), never by importing `site-content.ts`
 * directly. That's the seam where the future Admin panel plugs in:
 * swap what `getContent()` returns (static file -> API/DB) and every
 * component below keeps working unchanged, because the shape stays
 * the same.
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface RowItem {
  title: string;
  desc?: string;
  meta?: string;
  href?: string;
  placements?: Array<"bio" | "page">;
}

export interface RowSection {
  heading?: string;
  items: RowItem[];
}

/** Simple "list of rows" page shape — used by Projects and Equipment. */
export interface ListPageContent {
  lead: string;
  sections: RowSection[];
}

export interface ContactContent {
  lead: string;
  email: string;
  emailCtaLabel: string;
  otherContacts: RowItem[];
}

export interface HeroIdentity {
  avatarSrc: string | null;
  avatarAlt: string;
  avatarShape: "square" | "rounded" | "circle";
  avatarBackgroundOpacity: number;
  avatarFrameEnabled: boolean;
  avatarFrameColor: string;
  avatarFrameWidth: number;
  socialLinksPosition: "below-avatar" | "below-bio";
  name: string;
  tag: string;
  bio: string;
}

export interface TwitchLiveContent {
  enabled: boolean;
  /** Login da Twitch (minusculo, sem espacos) usado para consultar a Helix API. */
  channelLogin: string;
  /** Nome exibido em "{displayName} esta Ao vivo / off". */
  displayName: string;
  ctaLabel: string;
  url: string;
}

export interface LatestVideoContent {
  enabled: boolean;
  /**
   * IDs de canal do YouTube (formato "UC..."), NAO o @handle.
   * O widget busca o RSS de cada canal, pega o video mais recente entre
   * todos e usa o nome do canal que veio do proprio feed do YouTube.
   */
  channelIds: string[];
}

export interface NowPlayingWidgetContent {
  enabled: boolean;
  eyebrow: string;
  /** Usuario do Last.fm (a Scrobble API 2.0 do Last.fm alimenta este widget). */
  lastfmUsername: string;
}

export interface RankManualFallback {
  rankName: string;
  rankImageSrc?: string | null;
}

/**
 * De onde o rank desse jogo e buscado:
 *  - "deadlock-api": usa a deadlock-api.com (precisa de steamAccountId).
 *  - "overfast-api": usa a overfast-api.tekrop.fr (precisa de battleTag, e
 *    opcionalmente overwatchRole pra escolher tank/damage/support).
 *  - "manual": nao busca nada, so mostra o manualFallback.
 */
export type RankSource = "deadlock-api" | "overfast-api" | "manual";

export interface RankGameConfig {
  /** Nome exibido do jogo, ex: "Deadlock". */
  game: string;
  /** De onde os dados de rank desse jogo vem. */
  source: RankSource;
  /** [deadlock-api] SteamID64 ou SteamID3 (account_id) do jogador. */
  steamAccountId?: string;
  /** [overfast-api] BattleTag do jogador, ex: "Nyx#1234" (o "#" e trocado por "-" na hora de chamar a API). */
  battleTag?: string;
  /** [overfast-api] Qual role mostrar: "tank" | "damage" | "support". Padrao: "damage". */
  overwatchRole?: "tank" | "damage" | "support";
  /** Usado sempre que a API escolhida nao responder (sem dados, erro, etc). */
  manualFallback: RankManualFallback;
}

export interface RanksWidgetContent {
  enabled: boolean;
  eyebrow: string;
  games: RankGameConfig[];
}

export interface ChannelLinkItem extends RowItem {
  frequency?: string;
}

export interface ChannelGroup {
  enabled: boolean;
  heading: string;
  items: ChannelLinkItem[];
}

export interface HomeContent {
  identity: HeroIdentity;
  profileSocialButtonsEnabled: boolean;
  twitchLive: TwitchLiveContent;
  latestVideo: LatestVideoContent;
  nowPlayingWidget: NowPlayingWidgetContent;
  ranksWidget: RanksWidgetContent;
  youtube: ChannelGroup;
  tiktok: ChannelGroup;
  otherSocials: ChannelGroup;
}

export interface BrandContent {
  name: string;
  logoAlt: string;
  /** Quando null/ausente, o SiteNav usa o ícone SVG padrão. */
  logoSrc?: string | null;
}

export interface SiteContent {
  brand: BrandContent;
  nav: NavItem[];
  home: HomeContent;
  projects: ListPageContent;
  equipment: ListPageContent;
  contact: ContactContent;
}
