import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { createSteamOpenIdUrl } from "@/lib/steam";

export const dynamic = "force-dynamic";

const STEAM_OPENID_STATE_COOKIE = "nyx_steam_openid_state";

export async function GET(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isValidSessionToken(session))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", "/api/steam/connect");
    return NextResponse.redirect(loginUrl);
  }

  const configuredOrigin = process.env.STEAM_OPENID_ORIGIN?.replace(/\/+$/, "");
  const origin = configuredOrigin || request.nextUrl.origin;
  const state = randomUUID();
  const returnTo = `${origin}/api/steam/callback?state=${encodeURIComponent(state)}`;
  const response = NextResponse.redirect(createSteamOpenIdUrl(returnTo, `${origin}/`));
  response.cookies.set(STEAM_OPENID_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/steam",
    maxAge: 10 * 60,
  });
  return response;
}
