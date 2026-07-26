/**
 * Spotify Authorization Code Flow helpers.
 *
 * Server-only: the client secret is sent only to Spotify's token endpoint.
 */

export const SPOTIFY_OAUTH_STATE_COOKIE = "nyx_spotify_oauth_state";
export const SPOTIFY_OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
] as const;

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

function requiredEnvironment() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    "https://nyxaim.space/api/spotify/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET precisam estar configurados."
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function getSpotifyAuthorizationUrl(state: string): URL {
  const { clientId, redirectUri } = requiredEnvironment();
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES.join(" "),
    redirect_uri: redirectUri,
    state,
    show_dialog: "true",
  }).toString();
  return url;
}

export async function exchangeSpotifyAuthorizationCode(
  code: string
): Promise<SpotifyTokenResponse> {
  const { clientId, clientSecret, redirectUri } = requiredEnvironment();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | (Partial<SpotifyTokenResponse> & {
        error?: string;
        error_description?: string;
      })
    | null;

  if (!response.ok || !data?.access_token) {
    const detail = data?.error_description ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(`A Spotify recusou a troca do código: ${detail}`);
  }

  return data as SpotifyTokenResponse;
}

export function constantTimeStateEqual(
  received: string | null,
  expected: string | undefined
): boolean {
  if (!received || !expected || received.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < received.length; index += 1) {
    mismatch |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}
