import { NextRequest, NextResponse } from "next/server";
import { getRecentVideosAcrossChannels } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channelIdsParam = req.nextUrl.searchParams.get("channelIds") ?? "";
  const channelIds = channelIdsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    return NextResponse.json({ video: null, videos: [] });
  }

  try {
    const videos = await getRecentVideosAcrossChannels(channelIds, 3);
    return NextResponse.json({ video: videos[0] ?? null, videos });
  } catch (err) {
    console.error("[youtube/latest]", err);
    return NextResponse.json({ video: null, videos: [] });
  }
}
