"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { CrmDashboard } from "@/components/crm-dashboard";
import { AdminContentWorkspace } from "@/components/admin-content-workspace";
import { playUISound } from "@/lib/site-sounds";

export type AdminWorkspaceView = "settings" | "content" | "crm";

const SETTINGS_SECTIONS = [
  ["admin-identity", "Identidade"],
  ["admin-contact", "Contato e redes"],
  ["admin-appearance", "Aparência e shader"],
  ["admin-gallery", "Galeria"],
  ["admin-integrations", "Integrações"],
  ["admin-intro", "Introdução"],
  ["admin-pages", "Páginas"],
  ["admin-home-sections", "Seções da Home"],
] as const;

interface AdminWorkspaceOverlayProps {
  view: AdminWorkspaceView | null;
  onChangeView: (view: AdminWorkspaceView) => void;
  onClose: () => void;
}

export function AdminWorkspaceOverlay({ view, onChangeView, onClose }: AdminWorkspaceOverlayProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [updateState, setUpdateState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    if (!view) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, view]);

  if (!view) return null;

  async function logout() {
    playUISound("press");
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function updateFromGit() {
    if (!window.confirm("Buscar a versão mais recente da branch main e atualizar o site? O painel reiniciará ao final do build.")) return;
    setUpdateState("running");
    setUpdateMessage("Iniciando update pelo Git…");
    try {
      const response = await fetch("/api/admin/site-update", { method: "POST" });
      const result = await response.json().catch(() => null) as { message?: string; error?: string; detail?: string } | null;
      if (!response.ok) throw new Error(result?.detail || result?.error || "O servidor recusou o update.");
      setUpdateState("success");
      setUpdateMessage(result?.message ?? "Update iniciado. Aguarde o reinício do site.");
      playUISound("save");
    } catch (error) {
      setUpdateState("error");
      setUpdateMessage(error instanceof Error ? error.message : "Não foi possível atualizar o site.");
      playUISound("error");
    }
  }

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 p-2 backdrop-blur-md sm:p-4" role="dialog" aria-modal="true" aria-label="Workspace administrativo">
      <div className="mx-auto flex h-full max-w-[1580px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#111113] shadow-[0_30px_120px_rgba(0,0,0,.85)]">
        <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-white/10 bg-[#18181b] px-3 py-2 sm:px-4">
          <div className="mr-auto flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500 text-sm font-black text-white" aria-label="Voltar ao editor">N</button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">Admin Studio</p>
              <p className="truncate text-[10px] text-white/35">Tudo do projeto em um só lugar</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-1">
            <WorkspaceTab active={view === "settings"} onClick={() => onChangeView("settings")}>Configurações</WorkspaceTab>
            <WorkspaceTab active={view === "content"} onClick={() => onChangeView("content")}>Conteúdo</WorkspaceTab>
            <WorkspaceTab active={view === "crm"} onClick={() => onChangeView("crm")}>CRM</WorkspaceTab>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:bg-white/10 hover:text-white">Ver site ↗</a>
          <button type="button" onClick={updateFromGit} disabled={updateState === "running"} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-black transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50">{updateState === "running" ? "Atualizando…" : "Atualizar pelo Git"}</button>
          <button type="button" onClick={logout} disabled={loggingOut} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:border-red-400/30 hover:text-red-200 disabled:opacity-40">{loggingOut ? "Saindo…" : "Sair"}</button>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-lg text-white/55 transition hover:bg-white/10 hover:text-white" aria-label="Fechar workspace">×</button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="overflow-x-auto border-b border-white/10 bg-[#171719] p-2 md:overflow-y-auto md:border-r md:border-b-0 md:p-3">
            <p className="hidden px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 md:block">{view === "settings" ? "Configurações" : view === "content" ? "Conteúdo" : "Relacionamento"}</p>
            <div className="flex gap-1 md:flex-col">
              {view === "settings" ? SETTINGS_SECTIONS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => jumpTo(id)} className="shrink-0 rounded-lg px-3 py-2 text-left text-xs text-white/55 transition hover:bg-white/10 hover:text-white">{label}</button>
              )) : view === "content" ? (
                <>
                  <button type="button" onClick={() => jumpTo("admin-projects")} className="rounded-lg px-3 py-2 text-left text-xs text-white/55 transition hover:bg-white/10 hover:text-white">Projetos</button>
                  <button type="button" onClick={() => jumpTo("admin-equipment")} className="rounded-lg px-3 py-2 text-left text-xs text-white/55 transition hover:bg-white/10 hover:text-white">Equipamentos</button>
                  <button type="button" onClick={() => { onChangeView("settings"); requestAnimationFrame(() => jumpTo("admin-gallery")); }} className="rounded-lg px-3 py-2 text-left text-xs text-white/55 transition hover:bg-white/10 hover:text-white">Galeria</button>
                </>
              ) : (
                <>
                  <span className="rounded-lg bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-100">Pipeline e leads</span>
                  <span className="px-3 py-2 text-xs text-white/30">Histórico de contatos</span>
                  <span className="px-3 py-2 text-xs text-white/30">Próximas ações</span>
                </>
              )}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto bg-[#0d0d0f] px-4 py-6 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-6xl">{view === "settings" ? <AdminDashboard embedded /> : view === "content" ? <AdminContentWorkspace /> : <CrmDashboard embedded />}</div>
          </main>
        </div>
      </div>
      {updateMessage && (
        <div className={["fixed bottom-5 right-5 z-[110] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur", updateState === "error" ? "border-red-400/30 bg-red-950/90 text-red-100" : "border-emerald-400/30 bg-emerald-950/90 text-emerald-100"].join(" ")} role="status">
          {updateMessage}
        </div>
      )}
    </div>
  );
}

function WorkspaceTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={["rounded-md px-3 py-1.5 text-xs font-semibold transition", active ? "bg-white text-black" : "text-white/45 hover:text-white"].join(" ")}>{children}</button>;
}
