const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const STEAM_ID64_OFFSET = BigInt("76561197960265728");

export interface SteamProfile {
  steamId64: string;
  accountId: string;
  steamId3: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export function steamId64ToAccountId(steamId64: string) {
  if (!/^\d{17}$/.test(steamId64)) throw new Error("SteamID64 inválido.");
  const accountId = BigInt(steamId64) - STEAM_ID64_OFFSET;
  if (accountId < BigInt(0)) throw new Error("SteamID64 inválido.");
  return accountId.toString();
}

export function steamId64ToSteamId3(steamId64: string) {
  return `[U:1:${steamId64ToAccountId(steamId64)}]`;
}

export function createSteamOpenIdUrl(returnTo: string, realm: string) {
  const url = new URL(STEAM_OPENID_ENDPOINT);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnTo);
  url.searchParams.set("openid.realm", realm);
  url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
  url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");
  return url;
}

export async function verifySteamOpenId(searchParams: URLSearchParams) {
  const body = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (key.startsWith("openid.")) body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) return null;

  const verification = await response.text();
  if (!/(?:^|\n)is_valid:true(?:\r?\n|$)/.test(verification)) return null;

  const claimedId = searchParams.get("openid.claimed_id") ?? "";
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  return match?.[1] ?? null;
}

export async function getSteamProfile(steamId64: string): Promise<SteamProfile> {
  const apiKey = process.env.STEAM_WEB_API_KEY;
  const accountId = steamId64ToAccountId(steamId64);
  const fallback: SteamProfile = {
    steamId64,
    accountId,
    steamId3: `[U:1:${accountId}]`,
    personaName: null,
    avatarUrl: null,
    profileUrl: null,
  };
  if (!apiKey) return fallback;

  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
  url.searchParams.set("steamids", steamId64);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-webapi-key": apiKey,
    },
    cache: "no-store",
  });
  if (!response.ok) return fallback;

  const payload = await response.json() as {
    response?: {
      players?: Array<{
        personaname?: string;
        avatarfull?: string;
        profileurl?: string;
      }>;
    };
  };
  const player = payload.response?.players?.[0];
  return {
    ...fallback,
    personaName: player?.personaname ?? null,
    avatarUrl: player?.avatarfull ?? null,
    profileUrl: player?.profileurl ?? null,
  };
}
