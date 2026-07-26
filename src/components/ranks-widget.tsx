"use client";

import { useEffect, useState } from "react";
import { DeadlockWidgetModal } from "@/components/deadlock/deadlock-widget-modal";
import type { RankGameConfig, RanksWidgetContent } from "@/content/types";

interface RankState {
  name: string;
  iconUrl?: string | null;
  color?: string | null;
}

interface RankApiResponse {
  ok: boolean;
  rank: { name: string | null; iconUrl: string | null; color: string | null } | null;
}

function buildQuery(game: RankGameConfig): string | null {
  if (game.source === "deadlock-api" && game.steamAccountId) {
    return `source=deadlock-api&accountId=${encodeURIComponent(game.steamAccountId)}`;
  }
  if (game.source === "overfast-api" && game.battleTag) {
    const role = game.overwatchRole ?? "damage";
    return `source=overfast-api&battleTag=${encodeURIComponent(game.battleTag)}&role=${encodeURIComponent(role)}`;
  }
  return null;
}

function GameRank({ game }: { game: RankGameConfig }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rank, setRank] = useState<RankState>({
    name: game.manualFallback.rankName,
    iconUrl: game.manualFallback.rankImageSrc ?? null,
    color: null,
  });

  useEffect(() => {
    const query = buildQuery(game);
    if (!query) return;

    let cancelled = false;

    async function fetchRank() {
      try {
        const res = await fetch(`/api/ranks?${query}`, { cache: "no-store" });
        const data = (await res.json()) as RankApiResponse;

        // Se a API nao respondeu com dados, mantem o fallback manual
        // que ja esta no estado inicial — nao sobrescreve com nada vazio.
        if (!cancelled && data.ok && data.rank?.name) {
          setRank({ name: data.rank.name, iconUrl: data.rank.iconUrl, color: data.rank.color });
        }
      } catch {
        // mantem o fallback manual em caso de erro de rede
      }
    }

    fetchRank();
  }, [game]);

  const isDeadlock = game.source === "deadlock-api";

  return (
    <>
      <button
        type="button"
        onClick={() => isDeadlock && setModalOpen(true)}
        className={`flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 transition ${isDeadlock ? "cursor-pointer hover:border-white/35 hover:bg-white/5" : "cursor-default"}`}
        aria-haspopup={isDeadlock ? "dialog" : undefined}
      >
        {rank.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rank.iconUrl} alt={rank.name} className="h-4 w-4" />
        ) : null}
        <span className="text-xs" style={{ color: rank.color ?? "rgb(255 255 255 / .6)" }}>
          {game.game}: {rank.name}
        </span>
      </button>
      {isDeadlock ? (
        <DeadlockWidgetModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          game={game}
          rankName={rank.name}
          rankIconUrl={rank.iconUrl ?? null}
          rankColor={rank.color ?? null}
        />
      ) : null}
    </>
  );
}

export function RanksWidget({ content }: { content: RanksWidgetContent }) {
  if (!content.enabled) return null;

  return (
    <div className="site-panel flex h-full min-h-[220px] flex-col rounded-2xl border border-dashed border-white/20 bg-black/60 p-5">
      <span className="font-mono text-[11px] uppercase tracking-widest text-white/45">
        {content.eyebrow}
      </span>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          {content.games.map((game) => (
            <GameRank key={game.game} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}
