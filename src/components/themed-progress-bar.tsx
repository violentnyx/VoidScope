"use client";

import { formatMs } from "./now-playing-types";

export function ThemedProgressBar({
  progressMs,
  durationMs,
  color,
  showLabels = false,
}: {
  progressMs: number;
  durationMs: number;
  color: string;
  showLabels?: boolean;
}) {
  const pct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {showLabels && (
          <span className="shrink-0 font-mono text-[11px] text-white/50">{formatMs(progressMs)}</span>
        )}
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1.5px)",
            backgroundSize: "7px 100%",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] text-white/50">{formatMs(durationMs)}</span>
      </div>
    </div>
  );
}
