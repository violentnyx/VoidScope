"use client";

import { useEffect, useMemo, useState } from "react";
import type { RankGameConfig } from "@/content/types";
import { cdnUrl } from "@/lib/cdn";

const HERO_MASK_URL = cdnUrl("/deadlock/ui/hero-mask.png");
const MODAL_BACKGROUND_URL = cdnUrl("/deadlock/ui/modal-background.png");

interface WidgetPayload {
  player: { rankName: string; rankIconUrl: string | null };
  assets: { soulsIconUrl: string };
  recentMatches: Array<{
    matchId: string;
    heroName: string;
    portraitImageUrl: string | null;
    result: "win" | "loss" | "unknown";
    kills: number;
    deaths: number;
    assists: number;
    souls: number;
    averageBadge: number | null;
    averageRankIconUrl: string | null;
  }>;
  mostPlayedHero: null | {
    heroName: string;
    renderImageUrl: string;
    matches: number;
    wins: number;
    winRate: number;
  };
}

function formatSouls(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value || 0);
}

function formatWinRate(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MatchPortrait({
  heroUrl,
  rankUrl,
  heroName,
  result,
  lowestTier,
}: {
  heroUrl: string | null;
  rankUrl: string | null;
  heroName: string;
  result: "win" | "loss" | "unknown";
  lowestTier: boolean;
}) {
  return (
    <div className="relative h-[146px] w-[82px] shrink-0 sm:h-[162px] sm:w-[161px]">
      {heroUrl ? (
        <div
          className="absolute left-[31%] top-[19%] z-20 h-[70%] w-[38%] overflow-hidden"
          style={
            lowestTier
              ? undefined
              : {
                  maskImage: `url("${HERO_MASK_URL}")`,
                  maskPosition: "center",
                  maskRepeat: "no-repeat",
                  maskSize: "100% 100%",
                  WebkitMaskImage: `url("${HERO_MASK_URL}")`,
                  WebkitMaskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskSize: "100% 100%",
                }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroUrl}
            alt={heroName}
            className="h-full w-full object-cover object-[center_28%]"
          />
        </div>
      ) : null}
      {rankUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={rankUrl} alt="Rank médio da partida" className="absolute inset-y-0 left-[3%] z-10 h-full w-[94%] object-fill" />
      ) : null}
      <span
        aria-hidden
        className={`absolute bottom-[2%] left-1/2 z-30 h-[4px] w-[140px] -translate-x-1/2 ${
          result === "win" ? "bg-[#00ef4f]" : result === "loss" ? "bg-[#ff3038]" : "bg-white/35"
        }`}
      />
    </div>
  );
}

export function DeadlockWidgetModal({
  open,
  onClose,
  game,
  rankName,
  rankIconUrl,
  rankColor,
}: {
  open: boolean;
  onClose: () => void;
  game: RankGameConfig;
  rankName: string;
  rankIconUrl: string | null;
  rankColor: string | null;
}) {
  const [data, setData] = useState<WidgetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const accountId = game.steamAccountId ?? "";

  const query = useMemo(() => {
    const params = new URLSearchParams({ accountId, rankName });
    if (rankIconUrl) params.set("rankIconUrl", rankIconUrl);
    return params.toString();
  }, [accountId, rankIconUrl, rankName]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !accountId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/deadlock/widget?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Falha ao carregar Deadlock.");
        return payload as WidgetPayload;
      })
      .then((payload) => !cancelled && setData(payload))
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : "Falha ao carregar Deadlock."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [accountId, open, query]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;
  const hero = data?.mostPlayedHero;
  const recentMatches = (data?.recentMatches ?? []).slice(0, 3);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Estatísticas do Deadlock">
      <button aria-label="Fechar widget" className="absolute inset-0" onClick={onClose} />

      <section className="relative h-full max-h-[820px] w-full max-w-[1650px] overflow-hidden bg-[#090b0c] shadow-[0_32px_120px_rgba(0,0,0,.9)] sm:h-[min(90vh,820px)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${MODAL_BACKGROUND_URL}")` }}
        />
        <div className="absolute inset-0 bg-black/20" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-4 z-40 text-4xl font-light leading-none text-white/70 transition hover:text-white"
          aria-label="Fechar"
        >
          ×
        </button>

        <div className="relative z-10 h-full overflow-y-auto px-5 py-7 sm:px-10 sm:py-9 lg:overflow-hidden">
          <header className="flex h-[92px] items-center gap-4">
            {rankIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rankIconUrl} alt="" className="h-[78px] w-[78px] object-contain sm:h-[92px] sm:w-[92px]" />
            ) : null}
            <div>
              <h2
                className="text-[29px] font-black uppercase italic leading-none sm:text-[44px]"
                style={{ color: rankColor ?? "#fff" }}
              >
                {rankName}
              </h2>
            </div>
          </header>

          {loading ? (
            <div className="grid h-[520px] place-items-center text-sm uppercase tracking-[.22em] text-white/50">Carregando partidas...</div>
          ) : error ? (
            <div className="grid h-[520px] place-items-center text-center text-white/70">{error}</div>
          ) : (
            <div className="mt-5 grid gap-8 lg:mt-0">
              <section className="lg:absolute lg:bottom-[7%] lg:left-[5%] lg:z-20 lg:w-[47%]">
                <h3 className="mb-4 text-center text-[16px] font-black uppercase italic tracking-[-.02em] text-white sm:text-[22px]">Últimas partidas</h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-[repeat(3,161px)] lg:justify-center lg:gap-x-1">
                  {recentMatches.map((match) => (
                    <article key={match.matchId} className="relative min-w-0 text-center">
                      <MatchPortrait
                        heroUrl={match.portraitImageUrl}
                        rankUrl={match.averageRankIconUrl ?? rankIconUrl}
                        heroName={match.heroName}
                        result={match.result}
                        lowestTier={match.averageBadge != null && Math.floor(match.averageBadge / 10) <= 1}
                      />
                      <h4 className="mt-[-4px] whitespace-nowrap text-[14px] font-black uppercase italic leading-none text-white sm:text-[16px]">{match.heroName}</h4>
                      <div className="mt-2 flex items-center justify-center gap-1.5 whitespace-nowrap text-[10px] font-bold text-white/65 sm:text-[12px]">
                        {data?.assets.soulsIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={data.assets.soulsIconUrl} alt="Almas" className="h-[14px] w-[14px] brightness-0 invert opacity-75" />
                        ) : null}
                        <span>{formatSouls(match.souls)}</span>
                        <span className="text-white/30">·</span>
                        <span>{match.kills}/{match.deaths}/{match.assists}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="relative min-h-[520px] overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:min-h-0 lg:w-[50%]">
                <h3 className="relative z-20 text-center text-[14px] font-black uppercase italic text-white sm:text-[18px]">Herói mais jogado nos últimos 30 dias</h3>
                {hero ? (
                  <>
                    {hero.renderImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hero.renderImageUrl}
                        alt={hero.heroName}
                        className={`pointer-events-none absolute inset-[-5%] h-[110%] w-[110%] object-contain object-center drop-shadow-[0_22px_28px_rgba(0,0,0,.55)] transition-all duration-1000 ease-[cubic-bezier(.16,1,.3,1)] ${entered ? "translate-x-0 opacity-100" : "translate-x-[55%] opacity-0"}`}
                      />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-[5%] z-20 text-center">
                      <h4 className="font-serif text-[68px] font-black uppercase italic leading-[.8] tracking-[-.07em] text-white drop-shadow-[0_5px_8px_rgba(0,0,0,.85)] sm:text-[96px]">{hero.heroName}</h4>
                      <p className="mt-2 text-[14px] font-bold text-white/60 sm:text-[16px]">{formatWinRate(hero.winRate)}% WR · {hero.matches} partidas</p>
                    </div>
                  </>
                ) : (
                  <div className="grid h-full place-items-center text-white/40">Sem dados dos últimos 30 dias.</div>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
