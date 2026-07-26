import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { saveOverrides } from "@/lib/content-store";
import { getSteamProfile, verifySteamOpenId } from "@/lib/steam";

export const dynamic = "force-dynamic";

const STEAM_OPENID_STATE_COOKIE = "nyx_steam_openid_state";

function adminRedirect(request: NextRequest, status: "connected" | "cancelled" | "error") {
  const response = NextResponse.redirect(new URL(`/admin?steam=${status}`, request.url));
  response.cookies.set(STEAM_OPENID_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/api/steam",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isValidSessionToken(session))) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (request.nextUrl.searchParams.get("openid.mode") === "cancel") {
    return adminRedirect(request, "cancelled");
  }

  const expectedState = request.cookies.get(STEAM_OPENID_STATE_COOKIE)?.value;
  const returnedState = request.nextUrl.searchParams.get("state");
  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return adminRedirect(request, "error");
  }

  try {
    const steamId64 = await verifySteamOpenId(request.nextUrl.searchParams);
    if (!steamId64) return adminRedirect(request, "error");

    const profile = await getSteamProfile(steamId64);
    await saveOverrides({
      integrations: {
        ranks: {
          deadlock: {
            steamAccountId: profile.accountId,
            steamId64: profile.steamId64,
            steamId3: profile.steamId3,
            steamProfileName: profile.personaName,
            steamAvatarUrl: profile.avatarUrl,
            steamProfileUrl: profile.profileUrl,
          },
        },
      },
    });
    return adminRedirect(request, "connected");
  } catch (error) {
    console.error("[steam/callback]", error);
    return adminRedirect(request, "error");
  }
}
