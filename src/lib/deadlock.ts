import { cdnUrl } from "@/lib/cdn";

const API = "https://api.deadlock-api.com/v1";
const ASSETS = "https://assets-bucket.deadlock-api.com/assets-api-res";

export interface DeadlockMatchSummary {
  matchId: string;
  heroId: number | null;
  heroName: string;
  nameImageUrl: string | null;
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
  heroShowcases: DeadlockHeroShowcase[];
  mostPlayedHero: null | {
    heroId: number | null;
    heroName: string;
    nameImageUrl: string | null;
    renderImageUrl: string;
    matches: number;
    wins: number;
    winRate: number;
  };
}

export interface DeadlockHeroShowcase {
  kind: "recent" | "career" | "career-kda" | "lane";
  title: string;
  heroId: number;
  heroName: string;
  nameImageUrl: string | null;
  renderImageUrl: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  timePlayedSeconds: number;
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

async function getHeroStats(accountId: string) {
  try {
    return unwrapArray(
      await getJson(
        `${API}/players/hero-stats?account_ids=${encodeURIComponent(accountId)}`,
        900,
      ),
    );
  } catch {
    return [];
  }
}

async function getLaneMatchMetadata(history: JsonRecord[]) {
  const matchIds = history
    .map((match) => firstNumber(match, ["match_id", "matchId", "id"], -1))
    .filter((matchId) => matchId >= 0);
  const chunks: number[][] = [];
  for (let index = 0; index < matchIds.length; index += 40) {
    chunks.push(matchIds.slice(index, index + 40));
  }

  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({
        include_info: "true",
        include_player_info: "true",
        include_player_kda: "true",
      });
      for (const matchId of chunk) params.append("match_ids", String(matchId));
      try {
        const raw = await getJson(`${API}/matches/metadata?${params}`, 3600);
        if (Array.isArray(raw)) return unwrapArray(raw);
        return raw && typeof raw === "object" ? [raw as JsonRecord] : [];
      } catch {
        return [];
      }
    }),
  );

  return responses.flat();
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

function calculateKda(kills: number, deaths: number, assists: number) {
  return (kills + assists) / Math.max(1, deaths);
}

function heroShowcase(
  kind: DeadlockHeroShowcase["kind"],
  title: string,
  heroId: number,
  heroes: JsonRecord[],
  values: Omit<
    DeadlockHeroShowcase,
    "kind" | "title" | "heroId" | "heroName" | "nameImageUrl" | "renderImageUrl"
  >,
): DeadlockHeroShowcase {
  const hero = findHero(heroes, heroId);
  const heroName = firstString(hero ?? {}, ["name", "display_name"], "Unknown");
  const nameImageUrl = firstString(heroImages(hero), ["name_image"], "");
  return {
    kind,
    title,
    heroId,
    heroName,
    nameImageUrl: nameImageUrl || null,
    renderImageUrl: heroRenderUrl(heroName),
    ...values,
  };
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
  const [metadata, careerStats, laneMatches] = await Promise.all([
    Promise.all(
      recentSource.map((match) =>
        getMatchMetadata(String(firstNumber(match, ["match_id", "matchId", "id"]))),
      ),
    ),
    getHeroStats(accountId),
    getLaneMatchMetadata(history),
  ]);

  const recentMatches: DeadlockMatchSummary[] = recentSource.map((match, index) => {
    const heroIdValue = firstNumber(match, ["hero_id", "heroId", "player_hero_id"], -1);
    const heroId = heroIdValue >= 0 ? heroIdValue : null;
    const hero = findHero(heroes, heroId);
    const images = heroImages(hero);
    const heroName = firstString(hero ?? {}, ["name", "display_name"], "Unknown");
    const playerTeam = firstNumber(match, ["player_team", "team"], 0);
    const averageBadge = resolveAverageBadge(metadata[index], playerTeam);
    const result = matchResult(match);
    const nameImageUrl = firstString(images, ["name_image"], "");
    const gloatImageUrl = firstString(images, ["hero_card_gloat_webp", "hero_card_gloat"], "");
    const criticalImageUrl = firstString(images, ["hero_card_critical_webp", "hero_card_critical"], "");

    return {
      matchId: String(firstNumber(match, ["match_id", "matchId", "id"], index)),
      heroId,
      heroName,
      nameImageUrl: nameImageUrl || null,
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
  const stats = new Map<
    number,
    {
      matches: number;
      wins: number;
      draws: number;
      losses: number;
      kills: number;
      deaths: number;
      assists: number;
      timePlayedSeconds: number;
    }
  >();

  for (const match of lastThirtyDays) {
    const heroId = firstNumber(match, ["hero_id", "heroId", "player_hero_id"], -1);
    if (heroId < 0) continue;
    const current = stats.get(heroId) ?? {
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      timePlayedSeconds: 0,
    };
    current.matches += 1;
    const result = matchResult(match);
    if (result === "win") current.wins += 1;
    else if (result === "loss") current.losses += 1;
    else current.draws += 1;
    current.kills += firstNumber(match, ["player_kills", "kills"]);
    current.deaths += firstNumber(match, ["player_deaths", "deaths"]);
    current.assists += firstNumber(match, ["player_assists", "assists"]);
    current.timePlayedSeconds += firstNumber(match, ["match_duration_s", "duration_s"]);
    stats.set(heroId, current);
  }

  const topEntry = [...stats.entries()].sort((a, b) => b[1].matches - a[1].matches)[0] ?? null;
  const topHero = topEntry ? findHero(heroes, topEntry[0]) : null;
  const topHeroName = firstString(topHero ?? {}, ["name", "display_name"], "Unknown");
  const topHeroNameImageUrl = firstString(heroImages(topHero), ["name_image"], "");
  const heroShowcases: DeadlockHeroShowcase[] = [];

  if (topEntry) {
    const [heroId, value] = topEntry;
    heroShowcases.push(
      heroShowcase(
        "recent",
        "Herói mais jogado nos últimos 30 dias",
        heroId,
        heroes,
        {
          ...value,
          winRate: value.matches ? (value.wins / value.matches) * 100 : 0,
          kda: calculateKda(value.kills, value.deaths, value.assists),
        },
      ),
    );
  }

  const careerEntries = careerStats.filter(
    (entry) => firstNumber(entry, ["matches_played"], 0) > 0,
  );
  const meaningfulCareerEntries = careerEntries.filter(
    (entry) => firstNumber(entry, ["matches_played"], 0) >= 10,
  );
  const careerPool = meaningfulCareerEntries.length
    ? meaningfulCareerEntries
    : careerEntries;

  const bestCareer = [...careerPool].sort((left, right) => {
    const leftMatches = firstNumber(left, ["matches_played"], 0);
    const rightMatches = firstNumber(right, ["matches_played"], 0);
    const leftRate = firstNumber(left, ["wins"], 0) / Math.max(1, leftMatches);
    const rightRate = firstNumber(right, ["wins"], 0) / Math.max(1, rightMatches);
    return rightRate - leftRate || rightMatches - leftMatches;
  })[0];

  const bestCareerKda = [...careerPool].sort((left, right) => {
    const leftKda = calculateKda(
      firstNumber(left, ["kills"]),
      firstNumber(left, ["deaths"]),
      firstNumber(left, ["assists"]),
    );
    const rightKda = calculateKda(
      firstNumber(right, ["kills"]),
      firstNumber(right, ["deaths"]),
      firstNumber(right, ["assists"]),
    );
    return rightKda - leftKda;
  })[0];

  const addCareerShowcase = (
    entry: JsonRecord | undefined,
    kind: "career" | "career-kda",
    title: string,
  ) => {
    if (!entry) return;
    const heroId = firstNumber(entry, ["hero_id"], -1);
    if (heroId < 0) return;
    const matches = firstNumber(entry, ["matches_played"]);
    const wins = firstNumber(entry, ["wins"]);
    const kills = firstNumber(entry, ["kills"]);
    const deaths = firstNumber(entry, ["deaths"]);
    const assists = firstNumber(entry, ["assists"]);
    heroShowcases.push(
      heroShowcase(kind, title, heroId, heroes, {
        matches,
        wins,
        draws: 0,
        losses: Math.max(0, matches - wins),
        winRate: matches ? (wins / matches) * 100 : 0,
        kills,
        deaths,
        assists,
        kda: calculateKda(kills, deaths, assists),
        timePlayedSeconds: firstNumber(entry, ["time_played"]),
      }),
    );
  };

  addCareerShowcase(bestCareer, "career", "Melhor herói da carreira");
  addCareerShowcase(bestCareerKda, "career-kda", "Melhor KDA da carreira");

  const laneStats = new Map<
    number,
    {
      matches: number;
      wins: number;
      draws: number;
      losses: number;
      kills: number;
      deaths: number;
      assists: number;
    }
  >();

  for (const match of laneMatches) {
    const players = unwrapArray(match.players);
    const player = players.find(
      (candidate) => String(firstNumber(candidate, ["account_id"], -1)) === accountId,
    );
    if (!player) continue;
    const assignedLane = firstNumber(player, ["assigned_lane"], -1);
    const playerTeam = firstString(player, ["team"], "");
    if (assignedLane < 0 || !playerTeam) continue;
    const winningTeam = firstString(match, ["winning_team"], "");
    const matchOutcome = firstString(match, ["match_outcome"], "").toLowerCase();
    const seenHeroIds = new Set<number>();

    for (const opponent of players) {
      const opponentTeam = firstString(opponent, ["team"], "");
      if (
        !opponentTeam ||
        opponentTeam === playerTeam ||
        firstNumber(opponent, ["assigned_lane"], -2) !== assignedLane
      ) {
        continue;
      }
      const heroId = firstNumber(opponent, ["hero_id"], -1);
      if (heroId < 0 || seenHeroIds.has(heroId)) continue;
      seenHeroIds.add(heroId);

      const current = laneStats.get(heroId) ?? {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      };
      current.matches += 1;
      if (winningTeam === playerTeam) current.wins += 1;
      else if (!winningTeam || /draw|tie/.test(matchOutcome)) current.draws += 1;
      else current.losses += 1;
      current.kills += firstNumber(player, ["kills"]);
      current.deaths += firstNumber(player, ["deaths"]);
      current.assists += firstNumber(player, ["assists"]);
      laneStats.set(heroId, current);
    }
  }

  const topLaneEntry = [...laneStats.entries()].sort(
    (left, right) => right[1].matches - left[1].matches,
  )[0];
  if (topLaneEntry) {
    const [heroId, value] = topLaneEntry;
    heroShowcases.push(
      heroShowcase(
        "lane",
        "Herói mais enfrentado na fase de lane",
        heroId,
        heroes,
        {
          ...value,
          winRate: value.matches ? (value.wins / value.matches) * 100 : 0,
          kda: calculateKda(value.kills, value.deaths, value.assists),
          timePlayedSeconds: 0,
        },
      ),
    );
  }

  return {
    player: { rankName, rankIconUrl },
    assets: {
      soulsIconUrl: `${ASSETS}/icons/hud/icons/icon_souls.svg`,
    },
    recentMatches,
    heroShowcases,
    mostPlayedHero: topEntry ? {
      heroId: topEntry[0],
      heroName: topHeroName,
      nameImageUrl: topHeroNameImageUrl || null,
      renderImageUrl: heroRenderUrl(topHeroName),
      matches: topEntry[1].matches,
      wins: topEntry[1].wins,
      winRate: topEntry[1].matches ? (topEntry[1].wins / topEntry[1].matches) * 100 : 0,
    } : null,
  };
}
