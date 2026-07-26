"use client";

import { useEffect, useState } from "react";
import type { TwitchLiveContent } from "@/content/types";

interface TwitchStatus {
  isLive: boolean;
  title?: string;
  game?: string;
  thumbnailUrl?: string;
}

interface VodReplay {
  videoId: string | null;
  startTime?: string;
}

const POLL_INTERVAL_MS = 60_000;

type LoadState = "loading" | "loaded" | "error";

export function TwitchLiveCard({ content }: { content: TwitchLiveContent }) {
  const [status, setStatus] = useState<TwitchStatus | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [vod, setVod] = useState<VodReplay | null>(null);
  const [parentDomain, setParentDomain] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setParentDomain(window.location.hostname);
  }, []);

  useEffect(() => {
    if (!content.enabled || !content.channelLogin) return;

    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/twitch/status?login=${encodeURIComponent(content.channelLogin)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as TwitchStatus;
        if (!cancelled) {
          setStatus(data);
          setLoadState("loaded");
        }
      } catch {
        if (!cancelled) {
          setStatus({ isLive: false });
          setLoadState("error");
        }
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [content.enabled, content.channelLogin]);

  // Busca o replay (VOD mais recente) só depois de confirmar que está offline —
  // um pedido só, não fica repetindo a cada poll.
  useEffect(() => {
    if (!content.enabled || !content.channelLogin) return;
    if (loadState !== "loaded" || status?.isLive) return;
    if (vod !== null) return;

    let cancelled = false;

    async function fetchVod() {
      try {
        const res = await fetch(`/api/twitch/vod?login=${encodeURIComponent(content.channelLogin)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as VodReplay;
        if (!cancelled) setVod(data);
      } catch {
        if (!cancelled) setVod({ videoId: null });
      }
    }

    fetchVod();
    return () => {
      cancelled = true;
    };
  }, [content.enabled, content.channelLogin, loadState, status?.isLive, vod]);

  if (!content.enabled) return null;

  const isLive = status?.isLive ?? false;
  const streamInfo =
    isLive && status?.title ? `${status.title}${status.game ? ` // ${status.game}` : ""}` : null;

  const showReplay = !isLive && loadState === "loaded" && vod?.videoId && parentDomain;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {isLive && status?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={status.thumbnailUrl}
            alt="Preview da transmissao ao vivo"
            className="h-full w-full object-cover"
          />
        ) : showReplay ? (
          <>
            <iframe
              src={`https://player.twitch.tv/?video=${vod!.videoId}&parent=${parentDomain}&time=${vod!.startTime ?? "0h00m00s"}&autoplay=true&muted=true`}
              className="h-full w-full"
              allowFullScreen
              title="Replay da ultima stream"
            />
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70">
              Replay da ultima live
            </span>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/10 to-black text-center">
            {loadState === "loading" ? (
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">
                Verificando status da stream…
              </span>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">
                  {loadState === "error" ? "Nao foi possivel checar a Twitch" : "Offline no momento"}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <h2 className="flex flex-wrap items-center justify-center gap-2 font-sans text-xl font-extrabold uppercase italic text-white sm:text-2xl">
          <span>{content.displayName} está</span>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              Ao vivo
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            </span>
          ) : (
            <span className="text-white/50">off</span>
          )}
        </h2>
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-white/55">
          {streamInfo ?? "\u00A0"}
        </p>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          {content.ctaLabel}
        </a>
      </div>
    </div>
  );
}
