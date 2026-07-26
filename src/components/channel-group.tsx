import type { ChannelGroup } from "@/content/types";

export function ChannelGroupBlock({ group }: { group: ChannelGroup }) {
  if (!group.enabled || group.items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
        {group.heading}
      </h2>
      <div className="flex flex-col gap-2">
        {group.items.map((item, i) => (
          <a
            key={`${item.title}-${i}`}
            href={item.href ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3.5 transition-colors hover:border-white/30"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{item.title}</div>
              {item.desc && (
                <div className="mt-0.5 truncate text-xs text-white/55">{item.desc}</div>
              )}
            </div>
            {item.frequency && (
              <span className="shrink-0 text-xs text-white/55">{item.frequency}</span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
