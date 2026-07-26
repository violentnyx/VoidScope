"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LastfmTrack, TopListItem } from "./now-playing-types";
import { ThemedProgressBar } from "./themed-progress-bar";

interface NowPlayingModalProps {
  username: string;
  nowPlayingTrack: {
    name: string;
    artist: string;
    album?: string;
    albumArt?: string | null;
    url: string;
  } | null;
  progress: { current: number; duration: number } | null;
  isSpotify: boolean;
  dominantColor: string;
  onClose: () => void;
}

const PAGE_SIZE = 20;

/** Lista "infinita": busca a proxima pagina quando o sentinel entra na tela. */
function useInfiniteList<T>(
  username: string,
  endpoint: string,
  extraParams: Record<string, string>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const loadedPagesRef = useRef(new Set<number>());

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      if (!username || loadedPagesRef.current.has(pageToLoad)) return;
      loadedPagesRef.current.add(pageToLoad);
      setLoading(true);

      try {
        const params = new URLSearchParams({
          user: username,
          page: String(pageToLoad),
          limit: String(PAGE_SIZE),
          ...extraParams,
        });
        const res = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
        const data = (await res.json()) as { items: T[]; page: number; totalPages: number };
        setItems((prev) => (pageToLoad === 1 ? data.items : [...prev, ...data.items]));
        setTotalPages(data.totalPages || 1);
      } catch {
        // mantem o que ja tinha carregado
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [username, endpoint],
  );

  useEffect(() => {
    loadedPagesRef.current = new Set();
    setItems([]);
    setPage(1);
    setTotalPages(1);
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, endpoint]);

  const loadMore = useCallback(() => {
    if (loading || page >= totalPages) return;
    const next = page + 1;
    setPage(next);
    loadPage(next);
  }, [loading, page, totalPages, loadPage]);

  const hasMore = page < totalPages;

  return { items, loadMore, hasMore, loading };
}

function InfiniteSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { root: el.closest("[data-scroll-root]"), rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="h-2 w-full" />;
}

export function NowPlayingModal({
  username,
  nowPlayingTrack,
  progress,
  isSpotify,
  dominantColor,
  onClose,
}: NowPlayingModalProps) {
  const [recentTracks, setRecentTracks] = useState<LastfmTrack[]>([]);
  const topTracks = useInfiniteList<TopListItem>(username, "/api/lastfm/top-tracks", { period: "1month" });
  const topAlbums = useInfiniteList<TopListItem>(username, "/api/lastfm/top-albums", { period: "1month" });

  useEffect(() => {
    if (!username) return;
    fetch(`/api/lastfm/recent-tracks?user=${encodeURIComponent(username)}&limit=15`)
      .then((res) => res.json())
      .then((data: { items: LastfmTrack[] }) => setRecentTracks(data.items ?? []))
      .catch(() => setRecentTracks([]));
  }, [username]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#1a1a1a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="ml-auto mb-2 text-xs text-white/40 hover:text-white/70"
        >
          Fechar ✕
        </button>

        {/* Bloco principal do Spotify */}
        <div className="shrink-0">
          <span className="mb-3 block font-mono text-[11px] uppercase tracking-widest text-white/45">
            Ouvindo agora:
          </span>
          {nowPlayingTrack ? (
            <div
              className="flex min-h-[150px] items-center gap-5 rounded-2xl border border-white/10 p-4 sm:p-5"
              style={{
                background: `linear-gradient(110deg, ${dominantColor}30, rgba(255,255,255,.025) 55%, rgba(0,0,0,.2))`,
              }}
            >
              {nowPlayingTrack.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nowPlayingTrack.albumArt}
                  alt={nowPlayingTrack.name}
                  className="h-28 w-28 shrink-0 rounded-xl border border-white/10 object-cover shadow-2xl sm:h-32 sm:w-32"
                />
              ) : (
                <div className="h-28 w-28 shrink-0 rounded-xl border border-white/10 bg-white/5 sm:h-32 sm:w-32" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xl font-black text-white sm:text-2xl">{nowPlayingTrack.name}</div>
                <div className="mt-1 truncate text-sm text-white/65">{nowPlayingTrack.artist}</div>
                {nowPlayingTrack.album && (
                  <div className="truncate text-xs text-white/40">{nowPlayingTrack.album}</div>
                )}
                <div className="mt-5 max-w-xl">
                  {progress ? (
                    <ThemedProgressBar
                      progressMs={progress.current}
                      durationMs={progress.duration}
                      color={dominantColor}
                      showLabels
                    />
                  ) : (
                    <div className="h-1.5 w-full rounded-full bg-white/10" />
                  )}
                </div>
                {isSpotify ? (
                  <a
                    href={nowPlayingTrack.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center rounded-full bg-[#1ed760] px-4 py-2 text-xs font-black text-black transition hover:scale-[1.02] hover:bg-[#2bea6f]"
                  >
                    Ouvir no Spotify
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40">Nada tocando no momento.</p>
          )}
        </div>

        <div className="my-5 h-px w-full shrink-0 bg-white/10" />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden sm:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-5">
            <TopList title="Top listen Musicas Mensal" data={topTracks} />
            <div className="h-px w-full shrink-0 bg-white/10" />
            <TopList title="Top listen Album Mensal" data={topAlbums} />
          </div>
          <RecentTracksList tracks={recentTracks} />
        </div>
      </div>
    </div>
  );
}

function RecentTracksList({ tracks }: { tracks: LastfmTrack[] }) {
  return (
    <div className="flex min-h-0 flex-col border-white/10 sm:border-l sm:pl-6">
      <span className="mb-3 block font-mono text-[11px] uppercase tracking-widest text-white/45">
        Recentemente tocada
      </span>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {tracks.length === 0 ? (
          <span className="text-xs text-white/35">Sem histórico ainda.</span>
        ) : null}
        {tracks.slice(0, 15).map((track, index) => (
          <a
            key={`${track.artist}-${track.name}-${index}`}
            href={track.url || undefined}
            target={track.url ? "_blank" : undefined}
            rel={track.url ? "noreferrer" : undefined}
            className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-white/5"
          >
            {track.albumArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.albumArt}
                alt={track.name}
                className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-lg border border-white/10 bg-white/5" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white/80 group-hover:text-white">{track.name}</div>
              <div className="truncate text-xs text-white/45">{track.artist}</div>
              {track.album ? <div className="truncate text-[11px] text-white/30">{track.album}</div> : null}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function TopList({
  title,
  data,
}: {
  title: string;
  data: { items: TopListItem[]; loadMore: () => void; hasMore: boolean; loading: boolean };
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <span className="mb-3 block font-mono text-[11px] uppercase tracking-widest text-white/45">{title}</span>
      <div data-scroll-root className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {data.items.length === 0 && !data.loading && (
          <span className="text-xs text-white/35">Sem dados ainda esse mes.</span>
        )}
        {data.items.map((item, i) => (
          <div key={`${item.artist}-${item.name}-${i}`} className="flex items-center gap-3">
            {item.albumArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.albumArt}
                alt={item.name}
                className="h-12 w-12 shrink-0 rounded-lg border border-white/10 object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-lg border border-white/10 bg-white/5" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold uppercase text-white">{item.artist}</div>
              <div className="truncate text-xs text-white/60">{item.name}</div>
              <div className="text-[11px] text-white/35">{item.playcount} vezes</div>
            </div>
          </div>
        ))}
        {data.hasMore && <InfiniteSentinel onVisible={data.loadMore} />}
      </div>
    </div>
  );
}
