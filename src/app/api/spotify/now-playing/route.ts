import { NextResponse } from "next/server";
import { getSpotifyNowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const track = await getSpotifyNowPlaying();
    return NextResponse.json({ track });
  } catch (err) {
    console.error("[spotify/now-playing]", err);
    // Falha silenciosa pro front-end: o widget cai pro fallback do Last.fm.
    return NextResponse.json({ track: null });
  }
}
