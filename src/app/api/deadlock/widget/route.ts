import { NextRequest, NextResponse } from "next/server";
import { getDeadlockWidget } from "@/lib/deadlock";

export const dynamic = "force-dynamic";

function steamId64ToAccountId(value: string) {
  if (/^7656\d{13}$/.test(value)) return (BigInt(value) - BigInt("76561197960265728")).toString();
  return value;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("accountId")?.trim();
  if (!raw || !/^\d+$/.test(raw)) {
    return NextResponse.json({ error: "accountId inválido." }, { status: 400 });
  }

  try {
    const rankName = request.nextUrl.searchParams.get("rankName") || "Deadlock";
    const rankIconUrl = request.nextUrl.searchParams.get("rankIconUrl") || null;
    const payload = await getDeadlockWidget(steamId64ToAccountId(raw), rankName, rankIconUrl);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[deadlock/widget]", error);
    return NextResponse.json({ error: "Não foi possível carregar o widget do Deadlock." }, { status: 502 });
  }
}
