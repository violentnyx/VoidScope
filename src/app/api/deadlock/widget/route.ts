import { NextRequest, NextResponse } from "next/server";
import { getDeadlockWidget } from "@/lib/deadlock";
import { getPersistentSWR } from "@/lib/persistent-swr-cache";

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
    const accountId = steamId64ToAccountId(raw);
    const cached = await getPersistentSWR({
      key: `deadlock-widget:${accountId}`,
      maxAgeMs: 2 * 60 * 1000,
      forceRefresh: request.nextUrl.searchParams.get("refresh") === "1",
      loader: () => getDeadlockWidget(accountId, rankName, rankIconUrl),
      isValid: (payload) =>
        payload.recentMatches.length > 0 ||
        payload.heroShowcases.length > 0,
    });
    return NextResponse.json(
      {
        ...cached.value,
        player: {
          rankName,
          rankIconUrl,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
          "X-Nyx-Cache": cached.state,
          "X-Nyx-Cache-Checked-At": new Date(cached.checkedAt).toISOString(),
          "X-Nyx-Cache-Updated-At": new Date(cached.updatedAt).toISOString(),
        },
      },
    );
  } catch (error) {
    console.error("[deadlock/widget]", error);
    return NextResponse.json({ error: "Não foi possível carregar o widget do Deadlock." }, { status: 502 });
  }
}
