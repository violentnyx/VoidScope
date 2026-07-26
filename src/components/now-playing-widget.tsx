"use client";

import { useEffect, useRef, useState } from "react";
import type { NowPlayingWidgetContent } from "@/content/types";
import type { SpotifyNowPlayingTrack, LastfmTrack, TopListItem } from "./now-playing-types";
import { useDominantColor } from "@/hooks/use-dominant-color";
import { ThemedProgressBar } from "./themed-progress-bar";
import { NowPlayingModal } from "./now-playing-modal";

const LASTFM_POLL_MS = 30_000;
const SPOTIFY_POLL_MS = 10_000;

export function NowPlayingWidget({ content }: { content: NowPlayingWidgetContent }) {
  const [lastfmTrack, setLastfmTrack] = useState<LastfmTrack | null>(null);
  const [spotifyTrack, setSpotifyTrack] = useState<SpotifyNowPlayingTrack | null>(null);
  const [localProgressMs, setLocalProgressMs] = useState(0);
  const [topTracks, setTopTracks] = useState<TopListItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Last.fm — fallback (historico) quando o Spotify nao tem nada tocando.
  useEffect(() => {
    if (!content.enabled || !content.lastfmUsername) return;
    let cancelled = false;

    async function fetchTrack() {
      try {
        const res = await fetch(`/api/lastfm/now-playing?user=${encodeURIComponent(content.lastfmUsername)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { track: LastfmTrack | null };
        if (!cancelled) setLastfmTrack(data.track);
      } catch {
        if (!cancelled) setLastfmTrack(null);
      }
    }

    fetchTrack();
    const interval = setInterval(fetchTrack, LASTFM_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [content.enabled, content.lastfmUsername]);

  // Top 2 musicas do mes, pra lista lateral do card compacto.
  useEffect(() => {
    if (!content.enabled || !content.lastfmUsername) return;
    let cancelled = false;

    fetch(`/api/lastfm/top-tracks?user=${encodeURIComponent(content.lastfmUsername)}&period=1month&limit=2`)
      .then((res) => res.json())
      .then((data: { items: TopListItem[] }) => {
        if (!cancelled) setTopTracks(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setTopTracks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [content.enabled, content.lastfmUsername]);

  // Spotify — fonte principal, com progresso em tempo real.
  useEffect(() => {
    if (!content.enabled) return;
    let cancelled = false;

    async function fetchTrack() {
      try {
        const res = await fetch("/api/spotify/now-playing", { cache: "no-store" });
        const data = (await res.json()) as { track: SpotifyNowPlayingTrack | null };
        if (!cancelled) {
          setSpotifyTrack(data.track);
          setLocalProgressMs(data.track?.progressMs ?? 0);
        }
      } catch {
        if (!cancelled) setSpotifyTrack(null);
      }
    }

    fetchTrack();
    const interval = setInterval(fetchTrack, SPOTIFY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [content.enabled]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!spotifyTrack?.isPlaying) return;

    tickRef.current = setInterval(() => {
      setLocalProgressMs((prev) => Math.min(prev + 1000, spotifyTrack.durationMs));
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [spotifyTrack]);

  const showingSpotify = Boolean(spotifyTrack?.isPlaying);
  const track = showingSpotify ? spotifyTrack : null;
  const fallback = !showingSpotify ? lastfmTrack : null;
  const albumArt = track?.albumArt ?? fallback?.albumArt ?? null;
  const dominantColor = useDominantColor(albumArt);

  if (!content.enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex h-full min-h-[220px] w-full flex-row gap-4 rounded-2xl border border-dashed border-white/20 bg-black/60 p-5 text-left transition-colors hover:border-white/35"
      >
        {/* Coluna esquerda: capa + nome do album vertical + progresso + faixa/artista */}
        <div className="flex flex-1 gap-3">
          {(track || fallback) && (
            <span
              className="hidden shrink-0 rotate-180 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest text-white/40 sm:block"
              style={{ writingMode: "vertical-rl" }}
            >
              {track?.album || fallback?.album || ""}
            </span>
          )}

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            {albumArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={albumArt}
                alt={track?.name || fallback?.name || "Capa do album"}
                className="aspect-square w-full max-w-[180px] rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="aspect-square w-full max-w-[180px] rounded-2xl border border-white/10 bg-white/5" />
            )}

            <div className="mt-3 max-w-[180px]">
              {track ? (
                <ThemedProgressBar
                  progressMs={localProgressMs}
                  durationMs={track.durationMs}
                  color={dominantColor}
                  showLabels
                />
              ) : (
                <div className="h-1.5" />
              )}

              <div className="mt-2 truncate text-xs font-bold uppercase tracking-wide text-white">
                {track?.artist || fallback?.artist || "—"}
              </div>
              <div className="truncate text-xs text-white/60">
                {track?.name || fallback?.name || (content.lastfmUsername ? "Nada tocando" : "Last.fm nao configurado")}
              </div>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div className="hidden w-px shrink-0 bg-white/15 sm:block" />

        {/* Coluna direita: top listen mensal */}
        <div className="flex w-full max-w-[220px] flex-col gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-white/45">
            Top listen Mensal
          </span>
          <div className="flex flex-col gap-3">
            {topTracks.length === 0 && (
              <span className="text-xs text-white/35">Sem dados ainda esse mes.</span>
            )}
            {topTracks.map((item) => (
              <div key={`${item.artist}-${item.name}`} className="flex items-center gap-2">
                {item.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.albumArt}
                    alt={item.name}
                    className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 shrink-0 rounded-lg border border-white/10 bg-white/5" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold uppercase text-white">{item.artist}</div>
                  <div className="truncate text-xs text-white/60">{item.name}</div>
                  <div className="text-[11px] text-white/35">{item.playcount} vezes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </button>

      {modalOpen && (
        <NowPlayingModal
          username={content.lastfmUsername}
          nowPlayingTrack={
            track
              ? { name: track.name, artist: track.artist, album: track.album, albumArt: track.albumArt, url: track.url }
              : fallback
                ? { name: fallback.name, artist: fallback.artist, album: fallback.album, albumArt: fallback.albumArt, url: fallback.url }
                : null
          }
          progress={track ? { current: localProgressMs, duration: track.durationMs } : null}
          isSpotify={Boolean(track)}
          dominantColor={dominantColor}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
