import { NextRequest, NextResponse } from "next/server";
import { getLatestVideoAcrossChannels } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channelIdsParam = req.nextUrl.searchParams.get("channelIds") ?? "";
  const channelIds = channelIdsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    return NextResponse.json({ video: null });
  }

  try {
    const video = await getLatestVideoAcrossChannels(channelIds);
    return NextResponse.json({ video });
  } catch (err) {
    console.error("[youtube/latest]", err);
    return NextResponse.json({ video: null });
  }
}
