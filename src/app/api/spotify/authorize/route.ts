import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import {
  getSpotifyAuthorizationUrl,
  SPOTIFY_OAUTH_STATE_COOKIE,
  SPOTIFY_OAUTH_STATE_TTL_SECONDS,
} from "@/lib/spotify-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  try {
    if (!(await isValidSessionToken(session))) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", "/api/spotify/authorize");
      return NextResponse.redirect(loginUrl);
    }

    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(getSpotifyAuthorizationUrl(state));
    response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SPOTIFY_OAUTH_STATE_TTL_SECONDS,
      path: "/api/spotify",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[spotify/authorize]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar a autorização da Spotify.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
