import { NextRequest, NextResponse } from "next/server";
import { getPersistentSWR } from "@/lib/persistent-swr-cache";

export const dynamic = "force-dynamic";

/**
 * Rota de rank, com duas fontes possiveis (escolhidas via ?source=):
 *
 *  - source=deadlock-api  -> deadlock-api.com (grátis, sem chave)
 *      Query params: accountId (SteamID64 ou SteamID3/account_id)
 *
 *  - source=overfast-api  -> overfast-api.tekrop.fr (grátis, sem chave)
 *      Query params: battleTag (ex: "Nyx#1234"), role (tank|damage|support)
 *
 * Em qualquer erro (conta nao encontrada, API fora do ar, sem jogos
 * suficientes, etc.) devolve { ok: false, rank: null } e o widget usa o
 * fallback manual configurado em site-content.ts, sem quebrar a pagina.
 */

interface RankResult {
  ok: boolean;
  rank: { name: string; iconUrl: string | null; color: string | null } | null;
}

const NOT_FOUND: RankResult = { ok: false, rank: null };

// As 11 divisões de rank do Deadlock (Obscurus = sem rank calibrado ainda).
const DEADLOCK_SUBTIERS = ["I", "II", "III", "IV", "V", "VI"];

function normalizeSteamAccountId(value: string): string {
  const trimmed = value.trim();
  const steamId3 = trimmed.match(/^\[[^:\]]+:\d+:(\d+)\]$/);
  if (steamId3) return steamId3[1];
  if (/^7656\d{13}$/.test(trimmed)) {
    const STEAM_ID_64_OFFSET = BigInt("76561197960265728");
    return (BigInt(trimmed) - STEAM_ID_64_OFFSET).toString();
  }
  return /^\d+$/.test(trimmed) ? trimmed : "";
}

async function getDeadlockRank(accountIdRaw: string): Promise<RankResult> {
  const accountId = normalizeSteamAccountId(accountIdRaw);
  if (!accountId) return NOT_FOUND;

  const res = await fetch(`https://api.deadlock-api.com/v1/players/${accountId}/rank-predict`, {
    cache: "no-store",
  });
  if (!res.ok) return NOT_FOUND;

  const prediction = (await res.json()) as { badge?: number; matches_used?: number };
  const badge = Number(prediction.badge);
  if (!Number.isInteger(badge) || badge < 0) return NOT_FOUND;

  const tier = Math.floor(badge / 10);
  const subrank = badge % 10;
  const predictionImageUrl = `https://api.deadlock-api.com/v1/players/${accountId}/rank-predict/image`;

  try {
    const assetsRes = await fetch(`https://api.deadlock-api.com/v1/assets/ranks/${tier}`, {
      cache: "no-store",
    });
    if (!assetsRes.ok) return NOT_FOUND;

    const rankAsset = (await assetsRes.json()) as {
      name?: string;
      color?: string;
      images?: Record<string, string>;
    };
    if (!rankAsset.name) return NOT_FOUND;

    const imageKey = subrank >= 1 && subrank <= 6
      ? `large_subrank${subrank}_webp`
      : "large_webp";
    const iconUrl = rankAsset.images?.[imageKey]
      ?? rankAsset.images?.large_webp
      ?? predictionImageUrl;
    const subtier = DEADLOCK_SUBTIERS[subrank - 1];
    const name = subtier ? `${rankAsset.name} ${subtier}` : rankAsset.name;

    return {
      ok: true,
      rank: {
        name,
        iconUrl,
        color: rankAsset.color ?? null,
      },
    };
  } catch {
    return NOT_FOUND;
  }
}

async function getOverwatchRank(
  battleTagRaw: string,
  role: "tank" | "damage" | "support",
): Promise<RankResult> {
  const playerId = battleTagRaw.trim().replace("#", "-");
  if (!playerId) return NOT_FOUND;

  const res = await fetch(`https://overfast-api.tekrop.fr/players/${encodeURIComponent(playerId)}/summary`, {
    cache: "no-store",
  });
  if (!res.ok) return NOT_FOUND;

  const data = (await res.json()) as {
    competitive?: {
      pc?: Record<string, { division?: string; tier?: number; role_icon?: string; tier_icon?: string } | number | undefined>;
    };
  };

  const pc = data.competitive?.pc;
  if (!pc) return NOT_FOUND;

  const roleData = pc[role] as { division?: string; tier?: number; tier_icon?: string } | undefined;
  // Se a role escolhida nao tiver rank (ex: nao jogou nada nela ainda), tenta as outras.
  const fallbackOrder: Array<"tank" | "damage" | "support"> = ["damage", "tank", "support"];
  const picked =
    roleData?.division
      ? roleData
      : (fallbackOrder
          .map((r) => pc[r] as { division?: string; tier?: number; tier_icon?: string } | undefined)
          .find((r) => r?.division) ?? undefined);

  if (!picked?.division) return NOT_FOUND;

  const divisionName = picked.division.charAt(0).toUpperCase() + picked.division.slice(1);
  const name = picked.tier ? `${divisionName} ${picked.tier}` : divisionName;

  return { ok: true, rank: { name, iconUrl: picked.tier_icon ?? null, color: null } };
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source");

  try {
    if (source === "deadlock-api") {
      const accountId = req.nextUrl.searchParams.get("accountId");
      if (!accountId) return NextResponse.json(NOT_FOUND);
      const normalizedAccountId = normalizeSteamAccountId(accountId);
      if (!normalizedAccountId) return NextResponse.json(NOT_FOUND);
      const cached = await getPersistentSWR({
        key: `deadlock-rank:${normalizedAccountId}`,
        maxAgeMs: 5 * 60 * 1000,
        forceRefresh: req.nextUrl.searchParams.get("refresh") === "1",
        loader: () => getDeadlockRank(normalizedAccountId),
        isValid: (result) => result.ok && result.rank !== null,
      });
      return NextResponse.json(cached.value, {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
          "X-Nyx-Cache": cached.state,
          "X-Nyx-Cache-Checked-At": new Date(cached.checkedAt).toISOString(),
          "X-Nyx-Cache-Updated-At": new Date(cached.updatedAt).toISOString(),
        },
      });
    }

    if (source === "overfast-api") {
      const battleTag = req.nextUrl.searchParams.get("battleTag");
      const role = (req.nextUrl.searchParams.get("role") ?? "damage") as "tank" | "damage" | "support";
      if (!battleTag) return NextResponse.json(NOT_FOUND);
      return NextResponse.json(await getOverwatchRank(battleTag, role));
    }

    return NextResponse.json(NOT_FOUND);
  } catch (err) {
    console.error("[ranks]", err);
    return NextResponse.json(NOT_FOUND);
  }
}
