const DEFAULT_CDN_BASE_URL =
  "https://cdn.jsdelivr.net/gh/6Horas/contentwebsite@main";

export const CDN_BASE_URL = (
  process.env.NEXT_PUBLIC_CDN_BASE_URL || DEFAULT_CDN_BASE_URL
).replace(/\/+$/, "");

export function cdnUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${CDN_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
