"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HeroIdentityBlock } from "@/components/hero-identity";
import { LatestVideoHighlight } from "@/components/latest-video-highlight";
import { NowPlayingWidget } from "@/components/now-playing-widget";
import { RanksWidget } from "@/components/ranks-widget";
import { TwitchLiveCard } from "@/components/twitch-live-card";
import type { BrandContent, ContactContent, HomeContent, NavItem } from "@/content/types";
import type { LayoutDocument, LayoutNode } from "@/lib/layout-editor-types";

interface PreviewProps {
  initialDocument: LayoutDocument;
  initialPageId: string;
  brand: BrandContent;
  navItems: NavItem[];
  home: HomeContent;
  contact: ContactContent;
}

interface PreviewMessage {
  type: "voidscope:layout-preview";
  document: LayoutDocument;
  pageId: string;
  selectedId: string | null;
}

export function LayoutSitePreview({ initialDocument, initialPageId, brand, navItems, home, contact }: PreviewProps) {
  const [document, setDocument] = useState(initialDocument);
  const [pageId, setPageId] = useState(initialPageId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    function receivePreview(event: MessageEvent<PreviewMessage>) {
      if (event.origin !== window.location.origin || event.data?.type !== "voidscope:layout-preview") return;
      setDocument(event.data.document);
      setPageId(event.data.pageId);
      setSelectedId(event.data.selectedId);
    }
    window.addEventListener("message", receivePreview);
    window.parent.postMessage({ type: "voidscope:preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receivePreview);
  }, []);

  const page = useMemo(
    () => document.pages.find((item) => item.id === pageId) ?? document.pages[0],
    [document.pages, pageId],
  );

  const widgets: Record<Exclude<LayoutNode["type"], "container">, ReactNode> = {
    identity: <HeroIdentityBlock identity={home.identity} socials={home.profileSocialButtonsEnabled ? home.otherSocials.items.filter((item) => !item.placements || item.placements.includes("bio")) : []} email={home.profileSocialButtonsEnabled ? contact.email : undefined} />,
    twitch: <TwitchLiveCard content={home.twitchLive} />,
    video: <LatestVideoHighlight content={home.latestVideo} />,
    music: <NowPlayingWidget content={home.nowPlayingWidget} />,
    ranks: <RanksWidget content={home.ranksWidget} />,
  };

  const content = (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-20">
        {page?.nodes.filter((node) => node.visible).map((node) => (
          <section
            key={node.id}
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              window.parent.postMessage({ type: "voidscope:select-node", nodeId: node.id }, window.location.origin);
            }}
            className={[
              "relative min-w-0 rounded-xl transition",
              node.width === "full" ? "sm:col-span-2" : "",
              node.alignment === "center" ? "text-center" : node.alignment === "right" ? "text-right" : "",
              selectedId === node.id ? "outline outline-2 outline-offset-8 outline-violet-400" : "outline outline-1 outline-offset-8 outline-transparent hover:outline-white/20",
            ].join(" ")}
          >
            {selectedId === node.id && <span className="pointer-events-none absolute -top-5 left-0 z-50 rounded bg-violet-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{node.label}</span>}
            {node.type === "container" ? (
              <div className="min-h-32 rounded-xl border border-dashed border-white/20 bg-white/[.025] p-6 text-xs text-white/40">{node.label}</div>
            ) : widgets[node.type]}
          </section>
        ))}
      </div>
    </main>
  );

  return (
    <div className="fixed inset-0 z-[100] flex overflow-auto bg-black text-white">
      {document.navPosition === "left" ? <><PreviewNav brand={brand} items={navItems} vertical />{content}</> : (
        <div className="flex min-h-full w-full flex-col"><PreviewNav brand={brand} items={navItems} />{content}</div>
      )}
    </div>
  );
}

function PreviewNav({ brand, items, vertical = false }: { brand: BrandContent; items: NavItem[]; vertical?: boolean }) {
  return (
    <header className={vertical ? "sticky left-0 top-0 z-40 min-h-full w-52 shrink-0 p-4" : "sticky top-0 z-40 mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6"}>
      <nav className={["border border-white/10 bg-black/90 p-2 backdrop-blur-sm", vertical ? "flex h-full flex-col rounded-3xl" : "flex items-center justify-between gap-2 rounded-full px-3 sm:px-4"].join(" ")}>
        <Link href="/" onClick={(event) => event.preventDefault()} className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold">
          {brand.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoSrc} alt={brand.logoAlt} className="h-full w-full object-cover" />
          ) : brand.name.slice(0, 1)}
        </Link>
        <ul className={vertical ? "mt-6 flex flex-col gap-1" : "flex flex-wrap items-center gap-1"}>
          {items.map((item, index) => (
            <li key={item.href}><Link href={item.href} onClick={(event) => event.preventDefault()} className={`block rounded-full px-3.5 py-1.5 text-sm font-medium ${index === 0 ? "bg-white text-black" : "text-white/70 hover:bg-white hover:text-black"}`}>{item.label}</Link></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
