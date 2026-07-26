import { cdnUrl } from "@/lib/cdn";

const API = "https://api.deadlock-api.com/v1";
const ASSETS = "https://assets-bucket.deadlock-api.com/assets-api-res";

export interface DeadlockMatchSummary {
  matchId: string;
  heroId: number | null;
  heroName: string;
  portraitImageUrl: string | null;
  result: "win" | "loss" | "unknown";
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  averageBadge: number | null;
  averageRankIconUrl: string | null;
}

export interface DeadlockWidgetPayload {
  player: {
    rankName: string;
    rankIconUrl: string | null;
  };
  assets: {
    soulsIconUrl: string;
  };
  recentMatches: DeadlockMatchSummary[];
  mostPlayedHero: null | {
    heroId: number | null;
    heroName: string;
    renderImageUrl: string;
    matches: number;
    wins: number;
    winRate: number;
  };
}

type JsonRecord = Record<string, unknown>;

let heroesCache: JsonRecord[] | null = null;

async function getJson(url: string, revalidate = 300): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Deadlock API ${response.status}: ${url}`);
  return response.json();
}

function firstNumber(record: JsonRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
}

function firstString(record: JsonRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function unwrapArray(raw: unknown): JsonRecord[] {
  if (Array.isArray(raw)) {
    return raw.filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === "object"));
  }
  if (!raw || typeof raw !== "object") return [];
  const object = raw as JsonRecord;
  for (const key of ["matches", "match_history", "history", "data", "items", "heroes"]) {
    if (Array.isArray(object[key])) return unwrapArray(object[key]);
  }
  return [];
}

async function getHeroes() {
  if (heroesCache) return heroesCache;
  const candidates = [`${API}/assets/heroes`, `${API}/heroes`];
  for (const endpoint of candidates) {
    try {
      const heroes = unwrapArray(await getJson(endpoint, 3600));
      if (heroes.length) {
        heroesCache = heroes;
        return heroes;
      }
    } catch {
      // Tenta o próximo endpoint compatível.
    }
  }
  return [];
}

async function getMatchHistory(accountId: string) {
  for (const endpoint of [
    `${API}/players/${accountId}/match-history`,
    `${API}/players/${accountId}/matches`,
  ]) {
    try {
      const matches = unwrapArray(await getJson(endpoint, 120));
      if (matches.length) return matches;
    } catch {
      // Tenta o próximo endpoint compatível.
    }
  }
  return [];
}

async function getMatchMetadata(matchId: string): Promise<JsonRecord | null> {
  for (const endpoint of [
    `${API}/matches/${matchId}/metadata`,
    `${API}/matches/${matchId}`,
  ]) {
    try {
      const raw = await getJson(endpoint, 1800);
      if (!raw || typeof raw !== "object") continue;
      const record = raw as JsonRecord;
      const info = record.match_info;
      if (info && typeof info === "object") return info as JsonRecord;
      return record;
    } catch {
      // O card continua funcional sem o rank médio.
    }
  }
  return null;
}

function findHero(heroes: JsonRecord[], heroId: number | null) {
  if (heroId == null) return null;
  return heroes.find((hero) => firstNumber(hero, ["id", "hero_id", "class_id"], -1) === heroId) ?? null;
}

function heroImages(hero: JsonRecord | null) {
  const images = hero?.images;
  return images && typeof images === "object" ? images as JsonRecord : {};
}

function heroRenderUrl(heroName: string) {
  const filename = heroName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cdnUrl(`/deadlock/hero-renders/${filename}.png`);
}

function badgeAssetUrl(badge: number | null) {
  if (badge == null || badge < 0) return null;
  const rank = Math.floor(badge / 10);
  const subrank = badge % 10;
  if (rank < 0 || rank > 11) return null;
  const suffix = subrank >= 1 && subrank <= 6 ? `_subrank${subrank}` : "";
  return `${ASSETS}/images/ranks/rank${rank}/badge_lg${suffix}.png`;
}

function resolveAverageBadge(metadata: JsonRecord | null, playerTeam: number) {
  if (!metadata) return null;
  const key = playerTeam === 0 ? "average_badge_team0" : "average_badge_team1";
  const badge = firstNumber(metadata, [key], -1);
  return badge >= 0 ? badge : null;
}

function matchResult(match: JsonRecord): "win" | "loss" | "unknown" {
  const raw = match.match_result ?? match.won ?? match.win ?? match.victory;
  if (raw === true || raw === 1 || raw === "win") return "win";
  if (raw === false || raw === 0 || raw === "loss") return "loss";
  return "unknown";
}

export async function getDeadlockWidget(
  accountId: string,
  rankName: string,
  rankIconUrl: string | null,
): Promise<DeadlockWidgetPayload> {
  const [history, heroes] = await Promise.all([
    getMatchHistory(accountId),
    getHeroes(),
  ]);

  const recentSource = history.slice(0, 5);
  const metadata = await Promise.all(
    recentSource.map((match) => getMatchMetadata(String(firstNumber(match, ["match_id", "matchId", "id"])))),
  );

  const recentMatches: DeadlockMatchSummary[] = recentSource.map((match, index) => {
    const heroIdValue = firstNumber(match, ["hero_id", "heroId", "player_hero_id"], -1);
    const heroId = heroIdValue >= 0 ? heroIdValue : null;
    const hero = findHero(heroes, heroId);
    const images = heroImages(hero);
    const heroName = firstString(hero ?? {}, ["name", "display_name"], "Unknown");
    const playerTeam = firstNumber(match, ["player_team", "team"], 0);
    const averageBadge = resolveAverageBadge(metadata[index], playerTeam);
    const result = matchResult(match);
    const gloatImageUrl = firstString(images, ["hero_card_gloat_webp", "hero_card_gloat"], "");
    const criticalImageUrl = firstString(images, ["hero_card_critical_webp", "hero_card_critical"], "");

    return {
      matchId: String(firstNumber(match, ["match_id", "matchId", "id"], index)),
      heroId,
      heroName,
      portraitImageUrl: (result === "win" ? gloatImageUrl : criticalImageUrl) || gloatImageUrl || criticalImageUrl || null,
      result,
      kills: firstNumber(match, ["player_kills", "kills"]),
      deaths: firstNumber(match, ["player_deaths", "deaths"]),
      assists: firstNumber(match, ["player_assists", "assists"]),
      souls: firstNumber(match, ["net_worth", "souls", "souls_collected", "networth"]),
      averageBadge,
      averageRankIconUrl: badgeAssetUrl(averageBadge),
    };
  });

  const cutoff = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  const lastThirtyDays = history.filter((match) => firstNumber(match, ["start_time"], 0) >= cutoff);
  const stats = new Map<number, { matches: number; wins: number }>();

  for (const match of lastThirtyDays) {
    const heroId = firstNumber(match, ["hero_id", "heroId", "player_hero_id"], -1);
    if (heroId < 0) continue;
    const current = stats.get(heroId) ?? { matches: 0, wins: 0 };
    current.matches += 1;
    if (matchResult(match) === "win") current.wins += 1;
    stats.set(heroId, current);
  }

  const topEntry = [...stats.entries()].sort((a, b) => b[1].matches - a[1].matches)[0] ?? null;
  const topHero = topEntry ? findHero(heroes, topEntry[0]) : null;
  const topHeroName = firstString(topHero ?? {}, ["name", "display_name"], "Unknown");

  return {
    player: { rankName, rankIconUrl },
    assets: {
      soulsIconUrl: `${ASSETS}/icons/hud/icons/icon_souls.svg`,
    },
    recentMatches,
    mostPlayedHero: topEntry ? {
      heroId: topEntry[0],
      heroName: topHeroName,
      renderImageUrl: heroRenderUrl(topHeroName),
      matches: topEntry[1].matches,
      wins: topEntry[1].wins,
      winRate: topEntry[1].matches ? (topEntry[1].wins / topEntry[1].matches) * 100 : 0,
    } : null,
  };
}
