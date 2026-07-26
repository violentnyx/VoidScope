"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IdentityEditor } from "@/components/identity-editor";
import { IntegrationsEditor } from "@/components/integrations-editor";
import { GalleryManager } from "@/components/gallery-manager";
import { ContactSocialEditor } from "@/components/contact-social-editor";
import { ThemeShaderEditor } from "@/components/theme-shader-editor";
import { PAGE_ROUTES, type PageId } from "@/lib/page-ids";
import type { GalleryData } from "@/lib/gallery-store";
import { playUISound } from "@/lib/site-sounds";

/**
 * Painel Admin.
 *
 * "Identidade" salva sozinha (tem o próprio botão de salvar, dentro de
 * IdentityEditor). "Páginas" e "Seções da Home" usam o botão "Salvar e
 * aplicar" no fim da página: os toggles só mudam o estado local até
 * clicar nele — daí sim é gravado em data/site-settings.json e passa a
 * valer pro site de verdade:
 *  - Página em "Staging" mostra a tela de manutenção (shader dedicado
 *    com "EM CONSTRUÇÃO :(" embutido) pra quem não é admin, e some do
 *    header — quem está logado no painel continua vendo o link e o
 *    conteúdo normal.
 *  - Seção desligada some da Home pra todo mundo.
 */

type PageStatus = "ativo" | "staging";

interface PageRow {
  id: PageId;
  label: string;
  route: string;
}

interface SectionRow {
  id: string;
  label: string;
  hint: string;
}

const PAGE_ROWS: PageRow[] = [
  { id: "home", label: "Home", route: PAGE_ROUTES.home },
  { id: "projects", label: "Projects", route: PAGE_ROUTES.projects },
  { id: "equipment", label: "Equipment", route: PAGE_ROUTES.equipment },
  { id: "gallery", label: "Gallery", route: PAGE_ROUTES.gallery },
  { id: "contact", label: "Contact Me", route: PAGE_ROUTES.contact },
];

const SECTION_ROWS: SectionRow[] = [
  { id: "twitchLive", label: "Twitch ao vivo", hint: "Card no hero da Home" },
  { id: "profileSocialButtons", label: "Ícones sociais do perfil", hint: "Botões pequenos junto da foto ou bio" },
  { id: "latestVideo", label: "Vídeos recentes do YouTube", hint: "Módulo alimentado pelos canais conectados" },
  { id: "nowPlayingWidget", label: "Now Playing", hint: "Last.fm — tocando agora / scrobbles" },
  { id: "ranksWidget", label: "Ranks", hint: "Deadlock / Overwatch" },
  { id: "youtube", label: "YouTube (grupo de canais)", hint: "Lista de canais na Home" },
  { id: "tiktok", label: "TikTok (grupo de canais)", hint: "Lista de contas na Home" },
  { id: "otherSocials", label: "Botões grandes de redes sociais", hint: "Lista de links no final da Home" },
];

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminDashboard() {
  const router = useRouter();

  const [pages, setPages] = useState<Record<string, PageStatus>>({});
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [introEnabled, setIntroEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [gallery, setGallery] = useState<GalleryData | null>(null);

  useEffect(() => {
    fetch("/api/admin/gallery").then((r) => r.ok ? r.json() : null).then(setGallery).catch(() => null);
    fetch("/api/admin/settings")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: {
        introEnabled: boolean;
        pages: Record<string, PageStatus>;
        sections: Record<string, boolean>;
      }) => {
        setIntroEnabled(data.introEnabled ?? true);
        setPages(data.pages ?? {});
        setSections(data.sections ?? {});
      })
      .catch(() => setLoadError("Não consegui carregar o estado atual do site."))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    playUISound("press");
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function togglePageStatus(id: string) {
    setPages((prev) => {
      const goingToStaging = prev[id] !== "staging";
      playUISound(goingToStaging ? "toggleOn" : "toggleOff");
      return { ...prev, [id]: goingToStaging ? "staging" : "ativo" };
    });
    setSaveState("idle");
  }

  function toggleSection(id: string) {
    setSections((prev) => {
      const next = !prev[id];
      playUISound(next ? "toggleOn" : "toggleOff");
      return { ...prev, [id]: next };
    });
    setSaveState("idle");
  }

  async function handleSaveSettings() {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introEnabled, pages, sections }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Falha ao salvar.");
      }
      setSaveState("saved");
      playUISound("save");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("error");
      playUISound("error");
      setSaveError(err instanceof Error ? err.message : "Não consegui salvar. Tenta de novo.");
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Admin</h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="shrink-0 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-40"
        >
          {loggingOut ? "Saindo…" : "Sair"}
        </button>
      </div>
      <p className="mt-2 mb-6 max-w-xl text-sm text-white/60">
        Controle de páginas, seções e identidade do site.
      </p>

      {/* ---------- Identidade ---------- */}
      <section className="mb-10">
        <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          Identidade
        </h2>
        <IdentityEditor />
      </section>

      {/* ---------- Contato e mídias sociais ---------- */}
      <section className="mb-10">
        <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          Contato e mídias sociais
        </h2>
        <ContactSocialEditor />
      </section>

      {/* ---------- Aparência / Shader ---------- */}
      <section className="mb-10">
        <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          Aparência e Shader
        </h2>
        <ThemeShaderEditor />
      </section>

      {/* ---------- Galeria ---------- */}
      <section className="mb-10">
        <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">Galeria</h2>
        {gallery ? <GalleryManager initial={gallery} isAdmin adminMode /> : <p className="text-sm text-white/50">Carregando galeria…</p>}
      </section>

      {/* ---------- Integrações ---------- */}
      <section className="mb-10">
        <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
          Integrações
        </h2>
        <IntegrationsEditor />
      </section>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-6 text-sm text-white/50">
          Carregando…
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-400">{loadError}</p>
      ) : (
        <>
          {/* ---------- Intro ---------- */}
          <section className="mb-10">
            <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
              Introdução do site
            </h2>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  Exibir intro ao acessar
                </div>
                <div className="mt-0.5 text-xs text-white/55">
                  Mostra o interruptor, a logo, os sons e a transição antes do site.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !introEnabled;
                  setIntroEnabled(next);
                  setSaveState("idle");
                  playUISound(next ? "toggleOn" : "toggleOff");
                }}
                aria-pressed={introEnabled}
                className={[
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  introEnabled
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/50 hover:bg-white hover:text-black",
                ].join(" ")}
              >
                {introEnabled ? "Ativada" : "Desativada"}
              </button>
            </div>
          </section>

          {/* ---------- Páginas ---------- */}
          <section className="mb-10">
            <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
              Páginas
            </h2>
            <p className="mb-3 text-xs text-white/50">
              Em Staging, a página some do menu do header e quem
              acessar a URL direto vê uma tela de manutenção (shader
              com &quot;EM CONSTRUÇÃO :(&quot;) em vez do conteúdo —
              você continua vendo o link e o conteúdo normal enquanto
              estiver logado.
            </p>
            <div className="flex flex-col gap-2">
              {PAGE_ROWS.map((page) => {
                const status = pages[page.id] ?? "ativo";
                return (
                  <div
                    key={page.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{page.label}</div>
                      <div className="mt-0.5 truncate text-xs text-white/55">{page.route}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill status={status} />
                      <button
                        type="button"
                        onClick={() => togglePageStatus(page.id)}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white hover:text-black"
                      >
                        {status === "ativo" ? "Mandar pra Staging" : "Reativar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- Seções da Home ---------- */}
          <section className="mb-6">
            <h2 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white/80">
              Seções da Home
            </h2>
            <p className="mb-3 text-xs text-white/50">
              Liga/desliga cada bloco da Home individualmente — sem tela de
              manutenção, o bloco só some da página.
            </p>
            <div className="flex flex-col gap-2">
              {SECTION_ROWS.map((section) => {
                const enabled = Boolean(sections[section.id]);
                return (
                  <div
                    key={section.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{section.label}</div>
                      <div className="mt-0.5 truncate text-xs text-white/55">{section.hint}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-pressed={enabled}
                      className={[
                        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        enabled
                          ? "bg-white text-black"
                          : "border border-white/15 text-white/50 hover:bg-white hover:text-black",
                      ].join(" ")}
                    >
                      {enabled ? "Ativado" : "Desativado"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- Salvar ---------- */}
          <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saveState === "saving"}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {saveState === "saving" ? "Salvando…" : "Salvar e aplicar"}
            </button>
            {saveState === "saved" && (
              <span className="text-xs text-emerald-300">Salvo — já vale pro site.</span>
            )}
            {saveState === "error" && (
              <span className="text-xs text-red-400">{saveError}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: PageStatus }) {
  const isStaging = status === "staging";
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide",
        isStaging
          ? "border border-amber-400/40 bg-amber-400/10 text-amber-300"
          : "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
      ].join(" ")}
    >
      {isStaging ? "Staging" : "Ativo"}
    </span>
  );
}
