/**
 * Twitch Helix helpers (server-only).
 *
 * Usa o fluxo "client credentials" pra gerar um App Access Token — isso
 * NAO precisa que o Nyx faca login, so precisa do Client ID e do Client
 * Secret de uma aplicacao criada em https://dev.twitch.tv/console/apps.
 *
 * Variaveis de ambiente necessarias (colocar em .env.local, NUNCA no
 * codigo/commit):
 *   TWITCH_CLIENT_ID
 *   TWITCH_CLIENT_SECRET
 */

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET nao configurados.");
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Falha ao autenticar na Twitch (status ${res.status}).`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    token: data.access_token,
    // Margem de 60s antes do token expirar de verdade.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export interface TwitchStreamStatus {
  isLive: boolean;
  title?: string;
  game?: string;
  viewerCount?: number;
  startedAt?: string;
  thumbnailUrl?: string;
}

export async function getTwitchStreamStatus(login: string): Promise<TwitchStreamStatus> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const res = await fetch(
    `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`,
    {
      headers: {
        "Client-Id": clientId,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Falha ao consultar streams da Twitch (status ${res.status}).`);
  }

  const data = (await res.json()) as {
    data: Array<{
      title: string;
      game_name: string;
      viewer_count: number;
      started_at: string;
      thumbnail_url: string;
    }>;
  };

  const stream = data.data?.[0];

  if (!stream) {
    return { isLive: false };
  }

  return {
    isLive: true,
    title: stream.title,
    game: stream.game_name,
    viewerCount: stream.viewer_count,
    startedAt: stream.started_at,
    thumbnailUrl: stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720"),
  };
}

/** Converte durações do formato da Twitch ("1h2m3s", "45m30s", "30s") pra segundos. */
function parseTwitchDuration(duration: string): number {
  const match = duration.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

/** Converte segundos de volta pro formato "1h02m03s" que o player embed da Twitch espera no parametro `time`. */
function secondsToTwitchTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
}

export interface LatestVodReplay {
  videoId: string;
  /** Ponto de partida sugerido, formatado pro parametro `time` do player embed da Twitch. */
  startTime: string;
}

/**
 * Busca o VOD (replay) mais recente do canal e escolhe um ponto de partida
 * aleatorio entre 20% e 60% da duracao total, pra usar no player embed
 * enquanto o canal esta offline.
 */
export async function getLatestVodReplay(login: string): Promise<LatestVodReplay | null> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;
  const headers = { "Client-Id": clientId, Authorization: `Bearer ${token}` };

  const userRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    { headers, cache: "no-store" },
  );
  if (!userRes.ok) throw new Error(`Falha ao consultar usuario da Twitch (status ${userRes.status}).`);
  const userData = (await userRes.json()) as { data: Array<{ id: string }> };
  const userId = userData.data?.[0]?.id;
  if (!userId) return null;

  const videosRes = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(userId)}&type=archive&first=1`,
    { headers, cache: "no-store" },
  );
  if (!videosRes.ok) throw new Error(`Falha ao consultar VODs da Twitch (status ${videosRes.status}).`);
  const videosData = (await videosRes.json()) as {
    data: Array<{ id: string; duration: string }>;
  };
  const video = videosData.data?.[0];
  if (!video) return null;

  const durationSeconds = parseTwitchDuration(video.duration);
  if (durationSeconds <= 0) return null;

  // Ponto aleatorio entre 20% e 60% da duracao total.
  const minSeconds = Math.floor(durationSeconds * 0.2);
  const maxSeconds = Math.floor(durationSeconds * 0.6);
  const startSeconds = minSeconds + Math.floor(Math.random() * Math.max(1, maxSeconds - minSeconds));

  return { videoId: video.id, startTime: secondsToTwitchTime(startSeconds) };
}
