/**
 * YouTube "ultimo video" via RSS (server-only).
 *
 * Nao usa a YouTube Data API (evita precisar de API key e cota).
 * Todo canal do YouTube expoe um feed RSS publico com os videos mais
 * recentes, incluindo o NOME DO CANAL puxado direto do YouTube:
 *   https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxxx
 */
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export interface YoutubeLatestVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnailSrc: string;
  channelName: string;
  channelId: string;
  publishedAt: string;
}

interface YoutubeFeedEntry {
  "yt:videoId": string;
  title: string;
  link?: { "@_href"?: string };
  published: string;
  "media:group"?: {
    "media:thumbnail"?: { "@_url"?: string };
  };
}

interface YoutubeFeed {
  feed?: {
    author?: { name?: string };
    entry?: YoutubeFeedEntry | YoutubeFeedEntry[];
  };
}

async function fetchChannelLatestVideo(channelId: string): Promise<YoutubeLatestVideo | null> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    { cache: "no-store" },
  );

  if (!res.ok) return null;

  const xml = await res.text();
  const data = parser.parse(xml) as YoutubeFeed;
  const feed = data.feed;
  if (!feed) return null;

  const channelName = feed.author?.name ?? "";
  const entries = feed.entry;
  const entry = Array.isArray(entries) ? entries[0] : entries;
  if (!entry) return null;

  const videoId = entry["yt:videoId"];
  const title = entry.title;
  const url = entry.link?.["@_href"] ?? `https://www.youtube.com/watch?v=${videoId}`;
  const publishedAt = entry.published;
  const thumbnailSrc =
    entry["media:group"]?.["media:thumbnail"]?.["@_url"] ??
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return { videoId, title, url, thumbnailSrc, channelName, channelId, publishedAt };
}

/** Busca o feed de cada canal e retorna o video mais recente entre todos eles. */
export async function getLatestVideoAcrossChannels(
  channelIds: string[],
): Promise<YoutubeLatestVideo | null> {
  const results = await Promise.all(
    channelIds.map((id) => fetchChannelLatestVideo(id).catch(() => null)),
  );

  const valid = results.filter((r): r is YoutubeLatestVideo => r !== null);
  if (valid.length === 0) return null;

  valid.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return valid[0];
}
