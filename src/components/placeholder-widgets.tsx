import type { NowPlayingWidgetContent, RanksWidgetContent } from "@/content/types";

function WidgetShell({
  eyebrow,
  note,
  children,
}: {
  eyebrow: string;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-2xl border border-dashed border-white/20 bg-white/5 p-5">
      <span className="font-mono text-[11px] uppercase tracking-widest text-white/45">
        {eyebrow}
      </span>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        {children}
        <p className="max-w-[26ch] text-xs text-white/40">{note}</p>
      </div>
    </div>
  );
}

/** Now Playing (Spotify / YouTube Music) — layout placeholder only. */
export function NowPlayingWidget({ content }: { content: NowPlayingWidgetContent }) {
  if (!content.enabled) return null;
  return (
    <WidgetShell eyebrow={content.eyebrow} note="Integração em configuração.">
      <div className="h-14 w-14 rounded-md border border-white/15 bg-white/5" />
    </WidgetShell>
  );
}

/** Game ranks (Deadlock / Overwatch) — layout placeholder only. */
export function RanksWidget({ content }: { content: RanksWidgetContent }) {
  if (!content.enabled) return null;
  return (
    <WidgetShell eyebrow={content.eyebrow} note="Ranks em configuração.">
      <div className="flex gap-2">
        {content.games.map((game) => (
          <span
            key={game.game}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60"
          >
            {game.game}
          </span>
        ))}
      </div>
    </WidgetShell>
  );
}
