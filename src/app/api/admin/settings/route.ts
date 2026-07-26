import { NextRequest, NextResponse } from "next/server";
import { KNOWN_PAGE_IDS, getContent } from "@/lib/get-content";
import { saveSiteSettings, getSiteSettings, type PageStatus } from "@/lib/site-settings-store";

const KNOWN_SECTIONS = [
  "twitchLive",
  "latestVideo",
  "nowPlayingWidget",
  "ranksWidget",
  "youtube",
  "tiktok",
  "otherSocials",
] as const;

// GET: devolve o estado efetivo (já com defaults aplicados) de
// "Páginas" e "Seções da Home", pra pré-preencher os toggles do
// painel com a realidade atual do site.
export async function GET() {
  const settings = await getSiteSettings();
  const content = await getContent();

  const pages: Record<string, PageStatus> = {};
  for (const id of KNOWN_PAGE_IDS) {
    pages[id] = settings.pages?.[id] ?? "ativo";
  }

  const sections: Record<string, boolean> = {
    twitchLive: content.home.twitchLive.enabled,
    latestVideo: content.home.latestVideo.enabled,
    nowPlayingWidget: content.home.nowPlayingWidget.enabled,
    ranksWidget: content.home.ranksWidget.enabled,
    youtube: content.home.youtube.enabled,
    tiktok: content.home.tiktok.enabled,
    otherSocials: content.home.otherSocials.enabled,
  };

  return NextResponse.json({ pages, sections });
}

// POST: recebe os toggles marcados no painel e grava — a partir daqui
// já valem pro site de verdade (staging mostra a tela de manutenção,
// seções desligadas somem da Home). Validação simples de propósito,
// mesmo espírito do /api/admin/content.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const partial: { pages?: Record<string, PageStatus>; sections?: Record<string, boolean> } = {};

  if (typeof input.pages === "object" && input.pages !== null) {
    const pagesInput = input.pages as Record<string, unknown>;
    partial.pages = {};
    for (const id of KNOWN_PAGE_IDS) {
      const value = pagesInput[id];
      if (value === "ativo" || value === "staging") {
        partial.pages[id] = value;
      }
    }
  }

  if (typeof input.sections === "object" && input.sections !== null) {
    const sectionsInput = input.sections as Record<string, unknown>;
    partial.sections = {};
    for (const id of KNOWN_SECTIONS) {
      const value = sectionsInput[id];
      if (typeof value === "boolean") {
        partial.sections[id] = value;
      }
    }
  }

  try {
    const saved = await saveSiteSettings(partial);
    return NextResponse.json({ ok: true, settings: saved });
  } catch (err) {
    console.error("Erro salvando data/site-settings.json:", err);
    return NextResponse.json(
      { error: "Não deu pra salvar no servidor. Veja os logs do servidor para mais detalhes." },
      { status: 500 }
    );
  }
}
