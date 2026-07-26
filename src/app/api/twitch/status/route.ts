import { NextRequest, NextResponse } from "next/server";
import { getTwitchStreamStatus } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const login = req.nextUrl.searchParams.get("login");

  if (!login) {
    return NextResponse.json({ error: "missing login" }, { status: 400 });
  }

  try {
    const status = await getTwitchStreamStatus(login);
    return NextResponse.json(status);
  } catch (err) {
    console.error("[twitch/status]", err);
    // Falha silenciosa pro front-end: trata como offline em vez de quebrar a pagina.
    return NextResponse.json({ isLive: false });
  }
}
