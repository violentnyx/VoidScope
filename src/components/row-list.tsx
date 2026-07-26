import type { RowItem, RowSection } from "@/content/types";

function Row({ item }: { item: RowItem }) {
  const content = (
    <>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{item.title}</div>
        {item.desc && (
          <div className="mt-0.5 truncate text-xs text-white/55">{item.desc}</div>
        )}
      </div>
      {item.meta && (
        <span className="shrink-0 text-xs text-white/55">{item.meta}</span>
      )}
    </>
  );

  const className =
    "flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3.5 transition-colors hover:border-white/30";

  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export function RowSectionBlock({ section }: { section: RowSection }) {
  return (
    <div className="mb-8">
      {section.heading && (
        <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          {section.heading}
        </h2>
      )}
      <div className="flex flex-col gap-2">
        {section.items.map((item, i) => (
          <Row key={`${item.title}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
