"use client";

import { useEffect, useState } from "react";
import type { LatestVideoContent } from "@/content/types";

interface LatestVideo {
  title: string;
  url: string;
  thumbnailSrc: string;
  channelName: string;
}

export function LatestVideoHighlight({ content }: { content: LatestVideoContent }) {
  const [videos, setVideos] = useState<LatestVideo[]>([]);
  const channelIds = content.channelIds;

  useEffect(() => {
    if (!content.enabled || channelIds.length === 0) return;

    let cancelled = false;

    async function fetchLatest() {
      try {
        const res = await fetch(`/api/youtube/latest?channelIds=${channelIds.join(",")}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          video: LatestVideo | null;
          videos?: LatestVideo[];
        };
        if (!cancelled) {
          setVideos(data.videos ?? (data.video ? [data.video] : []));
        }
      } catch {
        if (!cancelled) setVideos([]);
      }
    }

    fetchLatest();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.enabled, channelIds.join(",")]);

  if (!content.enabled || channelIds.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-white/80">
        Vídeos recentes
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {videos.map((video) => (
          <a
            key={video.url}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="site-panel group overflow-hidden bg-black/60"
          >
            <div className="aspect-video overflow-hidden bg-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={video.thumbnailSrc}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-bold text-white">
                {video.title}
              </p>
              <p className="mt-1 truncate text-xs text-white/45">
                {video.channelName}
              </p>
            </div>
          </a>
        ))}
      </div>
      {videos.length === 0 ? (
        <p className="text-sm text-white/40">Nenhum vídeo encontrado ainda.</p>
      ) : null}
    </section>
  );
}
