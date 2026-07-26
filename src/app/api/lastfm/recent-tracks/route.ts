import { NextRequest, NextResponse } from "next/server";
import { getRecentTracks } from "@/lib/lastfm";

export const dynamic = "force-dynamic";

const EMPTY = { items: [], page: 1, totalPages: 1 };

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1") || 1;
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? "20") || 20);

  if (!user || !process.env.LASTFM_API_KEY) {
    return NextResponse.json(EMPTY);
  }

  try {
    const data = await getRecentTracks(user, page, limit);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[lastfm/recent-tracks]", err);
    return NextResponse.json(EMPTY);
  }
}
