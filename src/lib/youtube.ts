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

async function fetchChannelRecentVideos(
  channelId: string,
): Promise<YoutubeLatestVideo[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    { cache: "no-store" },
  );

  if (!res.ok) return [];

  const xml = await res.text();
  const data = parser.parse(xml) as YoutubeFeed;
  const feed = data.feed;
  if (!feed) return [];

  const channelName = feed.author?.name ?? "";
  const entries = feed.entry;
  const list = entries ? (Array.isArray(entries) ? entries : [entries]) : [];

  return list.slice(0, 8).map((entry) => {
    const videoId = entry["yt:videoId"];
    const title = entry.title;
    const url =
      entry.link?.["@_href"] ??
      `https://www.youtube.com/watch?v=${videoId}`;
    const publishedAt = entry.published;
    const thumbnailSrc =
      entry["media:group"]?.["media:thumbnail"]?.["@_url"] ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      videoId,
      title,
      url,
      thumbnailSrc,
      channelName,
      channelId,
      publishedAt,
    };
  });
}

/** Busca os feeds e retorna os vídeos mais recentes entre todos os canais. */
export async function getRecentVideosAcrossChannels(
  channelIds: string[],
  limit = 3,
): Promise<YoutubeLatestVideo[]> {
  const results = await Promise.all(
    channelIds.map((id) => fetchChannelRecentVideos(id).catch(() => [])),
  );

  const valid = results.flat();
  valid.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return valid.slice(0, limit);
}

export async function getLatestVideoAcrossChannels(
  channelIds: string[],
): Promise<YoutubeLatestVideo | null> {
  return (await getRecentVideosAcrossChannels(channelIds, 1))[0] ?? null;
}
