import { NextRequest, NextResponse } from "next/server";
import { getLatestVodReplay } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const login = req.nextUrl.searchParams.get("login");

  if (!login) {
    return NextResponse.json({ error: "missing login" }, { status: 400 });
  }

  try {
    const replay = await getLatestVodReplay(login);
    return NextResponse.json(replay ?? { videoId: null });
  } catch (err) {
    console.error("[twitch/vod]", err);
    // Falha silenciosa: o front-end simplesmente nao mostra o replay.
    return NextResponse.json({ videoId: null });
  }
}
