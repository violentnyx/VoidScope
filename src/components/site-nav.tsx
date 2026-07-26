"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BrandContent, NavItem } from "@/content/types";
import { playUISound } from "@/lib/site-sounds";

interface SiteNavProps {
  brand: BrandContent;
  items: NavItem[];
}

/**
 * Each page gets one pill in this bar. Idle state is bare text; the
 * active page (and hovered/focused pills) fill in solid white with
 * black text — one component, two states, no separate "menu".
 */
export function SiteNav({ brand, items }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4 sm:px-6">
      <nav className="flex items-center justify-between gap-2 rounded-full border border-white/10 bg-black/90 px-3 py-2 backdrop-blur-sm sm:px-4">
        <Link
          href="/"
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-white transition-opacity hover:opacity-70"
          aria-label={brand.name}
        >
          {brand.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoSrc} alt={brand.logoAlt} className="h-full w-full object-cover" />
          ) : (
            <LogoMark />
          )}
        </Link>

        <ul className="flex flex-wrap items-center gap-1">
          {items.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => playUISound("nav")}
                  className={[
                    "inline-block rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
                    isActive
                      ? "bg-white text-black"
                      : "text-white/70 hover:bg-white hover:text-black",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 0c.7 2.9 1.9 4.9 4.4 6.7C19 8.4 20.9 9.2 24 10c-3.1.8-5 1.6-7.6 3.3-2.5 1.8-3.7 3.8-4.4 6.7-.7-2.9-1.9-4.9-4.4-6.7C5.1 11.6 3.1 10.8 0 10c3.1-.8 5-1.6 7.6-3.3C10.1 4.9 11.3 2.9 12 0z" />
    </svg>
  );
}
