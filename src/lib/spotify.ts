/**
 * Spotify Web API helpers (server-only).
 *
 * Usa o fluxo "Authorization Code" JA AUTORIZADO — ou seja, o Nyx ja
 * gerou um refresh token uma vez (fora desse app) e so precisamos usar
 * esse refresh token pra pedir access tokens novos a cada request.
 *
 * Variaveis de ambiente necessarias (colocar em .env.local, NUNCA no
 * codigo/commit):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN
 */

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN nao configurados.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar o access token da Spotify (status ${res.status}).`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    token: data.access_token,
    // Margem de 60s antes do token expirar de verdade.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export interface SpotifyNowPlaying {
  isPlaying: boolean;
  name: string;
  artist: string;
  album?: string;
  albumArt?: string | null;
  url: string;
  progressMs: number;
  durationMs: number;
}

/**
 * Devolve o que esta tocando agora no Spotify do Nyx, ou null se nada
 * estiver tocando (ou o item atual for um episodio de podcast/anuncio
 * sem os campos que a gente usa).
 */
export async function getSpotifyNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const token = await getAccessToken();

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // 204 = nada tocando no momento. Isso e um estado normal, nao um erro.
  if (res.status === 204) return null;

  if (!res.ok) {
    throw new Error(`Falha ao consultar o player da Spotify (status ${res.status}).`);
  }

  const data = (await res.json()) as {
    is_playing: boolean;
    progress_ms: number | null;
    currently_playing_type: string;
    item: {
      name: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album?: { name: string; images: Array<{ url: string }> };
      external_urls: { spotify: string };
    } | null;
  };

  if (!data.item || data.currently_playing_type !== "track") return null;

  return {
    isPlaying: data.is_playing,
    name: data.item.name,
    artist: data.item.artists.map((a) => a.name).join(", "),
    album: data.item.album?.name,
    albumArt: data.item.album?.images?.[0]?.url ?? null,
    url: data.item.external_urls.spotify,
    progressMs: data.progress_ms ?? 0,
    durationMs: data.item.duration_ms,
  };
}
