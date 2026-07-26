export interface SpotifyNowPlayingTrack {
  isPlaying: boolean;
  name: string;
  artist: string;
  album?: string;
  albumArt?: string | null;
  url: string;
  progressMs: number;
  durationMs: number;
}

export interface LastfmTrack {
  name: string;
  artist: string;
  album?: string;
  albumArt?: string | null;
  url: string;
  isNowPlaying: boolean;
  playedAt?: string | null;
}

export interface TopListItem {
  name: string;
  artist: string;
  albumArt: string | null;
  url: string;
  playcount: number;
}

export function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
