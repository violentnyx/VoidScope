/**
 * Helpers compartilhados pra bater na Last.fm API 2.0 (audioscrobbler).
 * Só leitura, só precisa de LASTFM_API_KEY (sem OAuth).
 */

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

interface LastfmImage {
  size: string;
  "#text": string;
}

function pickImage(images: LastfmImage[] | undefined): string | null {
  return images?.find((img) => img.size === "extralarge")?.["#text"] || images?.at(-1)?.["#text"] || null;
}

async function callLastfm(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("LASTFM_API_KEY nao configurada.");

  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao consultar Last.fm (status ${res.status}).`);
  return res.json();
}

export interface TopTrackItem {
  name: string;
  artist: string;
  album?: string;
  albumArt: string | null;
  url: string;
  playcount: number;
}

export interface TopTracksPage {
  items: TopTrackItem[];
  page: number;
  totalPages: number;
}

export async function getTopTracks(user: string, period: string, page: number, limit: number): Promise<TopTracksPage> {
  const data = (await callLastfm({
    method: "user.gettoptracks",
    user,
    period,
    page: String(page),
    limit: String(limit),
  })) as {
    toptracks?: {
      track?: Array<{
        name: string;
        url: string;
        playcount: string;
        artist?: { name?: string };
        image?: LastfmImage[];
      }>;
      "@attr"?: { page?: string; totalPages?: string };
    };
  };

  const raw = data.toptracks?.track ?? [];

  return {
    items: raw.map((t) => ({
      name: t.name,
      artist: t.artist?.name ?? "",
      albumArt: pickImage(t.image),
      url: t.url,
      playcount: Number(t.playcount) || 0,
    })),
    page: Number(data.toptracks?.["@attr"]?.page) || page,
    totalPages: Number(data.toptracks?.["@attr"]?.totalPages) || 1,
  };
}

export interface TopAlbumItem {
  name: string;
  artist: string;
  albumArt: string | null;
  url: string;
  playcount: number;
}

export interface TopAlbumsPage {
  items: TopAlbumItem[];
  page: number;
  totalPages: number;
}

export async function getTopAlbums(user: string, period: string, page: number, limit: number): Promise<TopAlbumsPage> {
  const data = (await callLastfm({
    method: "user.gettopalbums",
    user,
    period,
    page: String(page),
    limit: String(limit),
  })) as {
    topalbums?: {
      album?: Array<{
        name: string;
        url: string;
        playcount: string;
        artist?: { name?: string };
        image?: LastfmImage[];
      }>;
      "@attr"?: { page?: string; totalPages?: string };
    };
  };

  const raw = data.topalbums?.album ?? [];

  return {
    items: raw.map((a) => ({
      name: a.name,
      artist: a.artist?.name ?? "",
      albumArt: pickImage(a.image),
      url: a.url,
      playcount: Number(a.playcount) || 0,
    })),
    page: Number(data.topalbums?.["@attr"]?.page) || page,
    totalPages: Number(data.topalbums?.["@attr"]?.totalPages) || 1,
  };
}

export interface RecentTrackItem {
  name: string;
  artist: string;
  album?: string;
  albumArt: string | null;
  url: string;
  isNowPlaying: boolean;
  playedAt: string | null;
}

export interface RecentTracksPage {
  items: RecentTrackItem[];
  page: number;
  totalPages: number;
}

export async function getRecentTracks(user: string, page: number, limit: number): Promise<RecentTracksPage> {
  const data = (await callLastfm({
    method: "user.getrecenttracks",
    user,
    page: String(page),
    limit: String(limit),
  })) as {
    recenttracks?: {
      track?: Array<{
        name: string;
        url: string;
        artist?: { "#text"?: string };
        album?: { "#text"?: string };
        image?: LastfmImage[];
        date?: { "#text"?: string };
        "@attr"?: { nowplaying?: string };
      }>;
      "@attr"?: { page?: string; totalPages?: string };
    };
  };

  const raw = data.recenttracks?.track ?? [];

  return {
    items: raw
      // A faixa "tocando agora" (sem timestamp) já é mostrada em outro lugar do widget.
      .filter((t) => t["@attr"]?.nowplaying !== "true")
      .map((t) => ({
        name: t.name,
        artist: t.artist?.["#text"] ?? "",
        album: t.album?.["#text"] ?? "",
        albumArt: pickImage(t.image),
        url: t.url,
        isNowPlaying: t["@attr"]?.nowplaying === "true",
        playedAt: t.date?.["#text"] ?? null,
      })),
    page: Number(data.recenttracks?.["@attr"]?.page) || page,
    totalPages: Number(data.recenttracks?.["@attr"]?.totalPages) || 1,
  };
}
