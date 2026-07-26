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
  const [video, setVideo] = useState<LatestVideo | null>(null);
  const channelIds = content.channelIds;

  useEffect(() => {
    if (!content.enabled || channelIds.length === 0) return;

    let cancelled = false;

    async function fetchLatest() {
      try {
        const res = await fetch(`/api/youtube/latest?channelIds=${channelIds.join(",")}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { video: LatestVideo | null };
        if (!cancelled) setVideo(data.video);
      } catch {
        if (!cancelled) setVideo(null);
      }
    }

    fetchLatest();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.enabled, channelIds.join(",")]);

  if (!content.enabled) return null;

  const eyebrow = video ? `Ultimo video // ${video.channelName}` : "Ultimo video";

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2 sm:gap-10">
      <div className="site-panel aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60">
        {video?.thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailSrc}
            alt="Thumbnail do video mais recente"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div>
        <p className="font-sans text-lg font-extrabold uppercase text-white sm:text-xl">{eyebrow}</p>
        {video ? (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-white/60 underline decoration-white/30 underline-offset-4 hover:text-white"
          >
            {video.title}
          </a>
        ) : (
          <p className="mt-2 text-sm text-white/40">Nenhum video encontrado ainda.</p>
        )}
      </div>
    </div>
  );
}
