import type { RowItem } from "@/content/types";

const iconSlugs: Array<[RegExp, string]> = [
  [/instagram/i, "instagram"],
  [/(twitter|(^|\s)x($|\s))/i, "x"],
  [/linkedin/i, "linkedin"],
  [/github/i, "github"],
  [/youtube/i, "youtube"],
  [/twitch/i, "twitch"],
  [/tiktok/i, "tiktok"],
  [/discord/i, "discord"],
  [/steam/i, "steam"],
  [/spotify/i, "spotify"],
  [/letterboxd/i, "letterboxd"],
  [/bluesky/i, "bluesky"],
  [/facebook/i, "facebook"],
  [/whatsapp/i, "whatsapp"],
  [/telegram/i, "telegram"],
  [/mastodon/i, "mastodon"],
  [/threads/i, "threads"],
  [/behance/i, "behance"],
  [/vimeo/i, "vimeo"],
];

function isUsableLink(href?: string) {
  return Boolean(href && /^(https?:\/\/|mailto:)/i.test(href));
}

function iconSlug(item: RowItem) {
  const source = `${item.title} ${item.href ?? ""}`;
  return iconSlugs.find(([pattern]) => pattern.test(source))?.[1] ?? null;
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current">
      <path strokeLinecap="round" strokeWidth="1.8" d="M9.5 14.5 14.5 9m-6.6 9.1-2 .8a3.5 3.5 0 0 1-4.6-4.6l2-5a3.5 3.5 0 0 1 4.6-2l1.2.5m6.9-2.9 2-.8a3.5 3.5 0 0 1 4.6 4.6l-2 5a3.5 3.5 0 0 1-4.6 2l-1.2-.5" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 6.5h18v11H3zM4 8l8 6 8-6" />
    </svg>
  );
}

export function SocialLinks({ email, items }: { email?: string; items: RowItem[] }) {
  const links = items.filter((item) => isUsableLink(item.href));
  const validEmail = email && !email.endsWith("@exemplo.com") ? email : null;

  if (!validEmail && links.length === 0) return null;

  return (
    <div className="mt-3 flex max-w-xs flex-wrap justify-center gap-2" aria-label="Redes sociais e contato">
      {validEmail ? (
        <a
          href={`mailto:${validEmail}`}
          title="E-mail"
          aria-label="E-mail"
          className="flex h-9 w-9 items-center justify-center bg-white/10 text-white transition hover:bg-white hover:text-black"
        >
          <MailGlyph />
        </a>
      ) : null}

      {links.map((item, index) => {
        const slug = iconSlug(item);
        return (
          <a
            key={`${item.title}-${item.href}-${index}`}
            href={item.href!}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
            aria-label={item.title}
            className="group flex h-9 w-9 items-center justify-center bg-white/10 text-white transition hover:bg-white hover:text-black"
          >
            {slug ? (
              // Simple Icons supplies consistent monochrome brand marks.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://cdn.simpleicons.org/${slug}/ffffff?viewbox=auto`}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 transition group-hover:invert"
              />
            ) : (
              <LinkGlyph />
            )}
          </a>
        );
      })}
    </div>
  );
}
