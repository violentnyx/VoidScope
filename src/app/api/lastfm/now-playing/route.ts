import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Last.fm API 2.0 (audioscrobbler) — metodo user.getrecenttracks.
 * Pega a musica tocando agora (ou a ultima ouvida) do usuario configurado.
 *
 * Precisa de LASTFM_API_KEY em .env.local (pega gratis em
 * https://www.last.fm/api/account/create). Nao precisa de secret nem de
 * OAuth pra leitura, so a api_key.
 */

interface LastfmImage {
  size: string;
  "#text": string;
}

interface LastfmTrackRaw {
  name: string;
  url: string;
  artist?: { "#text"?: string };
  album?: { "#text"?: string };
  image?: LastfmImage[];
  date?: { "#text"?: string };
  "@attr"?: { nowplaying?: string };
}

interface LastfmResponse {
  recenttracks?: { track?: LastfmTrackRaw[] };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("user");
  const apiKey = process.env.LASTFM_API_KEY;

  if (!username || !apiKey) {
    return NextResponse.json({ track: null });
  }

  try {
    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.searchParams.set("method", "user.getrecenttracks");
    url.searchParams.set("user", username);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao consultar Last.fm (status ${res.status}).`);

    const data = (await res.json()) as LastfmResponse;
    const track = data.recenttracks?.track?.[0];

    if (!track) {
      return NextResponse.json({ track: null });
    }

    const albumArt =
      track.image?.find((img) => img.size === "extralarge")?.["#text"] ||
      track.image?.at(-1)?.["#text"] ||
      null;

    return NextResponse.json({
      track: {
        name: track.name,
        artist: track.artist?.["#text"] ?? "",
        album: track.album?.["#text"] ?? "",
        albumArt: albumArt || null,
        url: track.url,
        isNowPlaying: track["@attr"]?.nowplaying === "true",
        playedAt: track.date?.["#text"] ?? null,
      },
    });
  } catch (err) {
    console.error("[lastfm/now-playing]", err);
    return NextResponse.json({ track: null });
  }
}
