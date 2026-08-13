"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminWorkspaceOverlay, type AdminWorkspaceView } from "@/components/admin-workspace-overlay";
import {
  DEFAULT_LAYOUT_DOCUMENT,
  type LayoutDocument,
  type LayoutNode,
  type LayoutNodeType,
} from "@/lib/layout-editor-types";

type Device = "desktop" | "tablet" | "mobile";
type SaveState = "idle" | "saving" | "saved" | "error";

const BLOCKS: { type: LayoutNodeType; label: string; hint: string }[] = [
  { type: "identity", label: "Identidade", hint: "Foto, nome e bio" },
  { type: "twitch", label: "Twitch", hint: "Status e transmissão" },
  { type: "video", label: "Vídeo", hint: "Destaque do YouTube" },
  { type: "music", label: "Now Playing", hint: "Last.fm e histórico" },
  { type: "ranks", label: "Ranks", hint: "Ranks dos jogos" },
  { type: "container", label: "Container", hint: "Agrupar elementos" },
];

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "max-w-[940px]",
  tablet: "max-w-[720px]",
  mobile: "max-w-[390px]",
};

export function AdminLayoutEditor() {
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [document, setDocument] = useState<LayoutDocument>(DEFAULT_LAYOUT_DOCUMENT);
  const [pageId, setPageId] = useState("home");
  const [selectedId, setSelectedId] = useState<string | null>("identity");
  const [device, setDevice] = useState<Device>("desktop");
  const [leftTab, setLeftTab] = useState<"layers" | "insert">("layers");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("Carregando rascunho…");
  const [workspaceView, setWorkspaceView] = useState<AdminWorkspaceView | null>(null);

  useEffect(() => {
    fetch("/api/admin/layout")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { draft?: LayoutDocument; publishedAt?: string }) => {
        if (data.draft) setDocument(data.draft);
        setMessage(data.publishedAt ? "Existe uma versão publicada." : "Ainda não publicado.");
      })
      .catch(() => setMessage("Não foi possível carregar; usando o modelo inicial."));
  }, []);

  const activePage = useMemo(
    () => document.pages.find((page) => page.id === pageId) ?? document.pages[0],
    [document.pages, pageId],
  );
  const selected = activePage.nodes.find((node) => node.id === selectedId) ?? null;

  useEffect(() => {
    previewRef.current?.contentWindow?.postMessage({
      type: "voidscope:layout-preview",
      document,
      pageId: activePage.id,
      selectedId,
    }, window.location.origin);
  }, [activePage.id, document, selectedId]);

  useEffect(() => {
    function receivePreview(event: MessageEvent<{ type?: string; nodeId?: string }>) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "voidscope:select-node" && event.data.nodeId) {
        setSelectedId(event.data.nodeId);
      }
      if (event.data?.type === "voidscope:preview-ready") {
        previewRef.current?.contentWindow?.postMessage({
          type: "voidscope:layout-preview",
          document,
          pageId: activePage.id,
          selectedId,
        }, window.location.origin);
      }
    }
    window.addEventListener("message", receivePreview);
    return () => window.removeEventListener("message", receivePreview);
  }, [activePage.id, document, selectedId]);

  function updateNodes(updater: (nodes: LayoutNode[]) => LayoutNode[]) {
    setDocument((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === activePage.id ? { ...page, nodes: updater(page.nodes) } : page,
      ),
    }));
    setSaveState("idle");
  }

  function updateSelected(patch: Partial<LayoutNode>) {
    if (selected) updateNodes((nodes) => nodes.map((node) => node.id === selected.id ? { ...node, ...patch } : node));
  }

  function moveBefore(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    updateNodes((nodes) => {
      const moving = nodes.find((node) => node.id === draggedId);
      if (!moving) return nodes;
      const next = nodes.filter((node) => node.id !== draggedId);
      next.splice(next.findIndex((node) => node.id === targetId), 0, moving);
      return next;
    });
  }

  function addBlock(type: LayoutNodeType, label: string) {
    const id = `${type}-${window.crypto.randomUUID()}`;
    updateNodes((nodes) => [...nodes, {
      id,
      type,
      label,
      width: type === "video" || type === "container" ? "full" : "half",
      visible: true,
      locked: false,
    }]);
    setSelectedId(id);
    setLeftTab("layers");
  }

  function addPage() {
    const sequence = document.pages.length + 1;
    const id = `page-${window.crypto.randomUUID()}`;
    setDocument((current) => ({
      ...current,
      pages: [...current.pages, { id, name: `Página ${sequence}`, route: `/pagina-${sequence}`, nodes: [] }],
    }));
    setPageId(id);
    setSelectedId(null);
    setSaveState("idle");
  }

  async function save(action: "draft" | "publish") {
    setSaveState("saving");
    try {
      const response = await fetch("/api/admin/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, document }),
      });
      if (!response.ok) throw new Error();
      setSaveState("saved");
      setMessage(action === "publish"
        ? "Versão publicada no editor. A home ainda não usa este layout."
        : "Rascunho salvo no servidor.");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch {
      setSaveState("error");
      setMessage("Não foi possível salvar.");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex min-h-0 flex-col overflow-hidden bg-[#0b0b0d]">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#151517] px-4 py-3 shadow-lg">
        <div className="mr-auto">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-white/45 hover:text-white">Admin Studio</Link>
            <span className="text-white/20">/</span>
            <h1 className="text-lg font-bold">Editor de Layout</h1>
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">Alpha</span>
          </div>
          <p className="mt-1 text-xs text-white/45">{message}</p>
        </div>
        <button type="button" onClick={() => setWorkspaceView("settings")} className="rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-white">⚙ Configurações</button>
        <button type="button" onClick={() => setWorkspaceView("content")} className="rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-white">Conteúdo</button>
        <button type="button" onClick={() => setWorkspaceView("crm")} className="rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white">CRM</button>
        <a href="/3jstest" target="_blank" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/10">Abrir teste ↗</a>
        <button onClick={() => save("draft")} disabled={saveState === "saving"} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40">
          {saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : "Salvar rascunho"}
        </button>
        <button onClick={() => save("publish")} disabled={saveState === "saving"} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold hover:bg-violet-400 disabled:opacity-40">Publicar</button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(640px,1fr)_260px] overflow-auto bg-[#111113]">
        <aside className="min-h-0 overflow-y-auto border-r border-white/10 bg-[#171719]">
          <div className="grid grid-cols-2 border-b border-white/10">
            {(["layers", "insert"] as const).map((tab) => (
              <button key={tab} onClick={() => setLeftTab(tab)} className={`px-3 py-3 text-xs font-semibold ${leftTab === tab ? "border-b-2 border-violet-400 text-white" : "text-white/45"}`}>
                {tab === "layers" ? "Camadas" : "Inserir"}
              </button>
            ))}
          </div>

          {leftTab === "layers" ? (
            <>
              <div className="border-b border-white/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <PanelTitle>Páginas</PanelTitle>
                  <button onClick={addPage} title="Criar página" className="h-6 w-6 rounded-md text-lg text-white/55 hover:bg-white/10 hover:text-white">+</button>
                </div>
                <div className="space-y-1">
                  {document.pages.map((page) => (
                    <button key={page.id} onClick={() => { setPageId(page.id); setSelectedId(page.nodes[0]?.id ?? null); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${activePage.id === page.id ? "bg-violet-500/20 text-violet-100" : "text-white/55 hover:bg-white/5"}`}>
                      <span>▱</span><span className="truncate">{page.name}</span><span className="ml-auto text-[10px] text-white/25">{page.route}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <PanelTitle>Camadas de {activePage.name}</PanelTitle>
                <div className="mt-2 space-y-1">
                  {activePage.nodes.map((node) => (
                    <button
                      key={node.id}
                      draggable={!node.locked}
                      onDragStart={() => setDraggedId(node.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => moveBefore(node.id)}
                      onClick={() => setSelectedId(node.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${selectedId === node.id ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"} ${!node.visible ? "opacity-35" : ""}`}
                    >
                      <span className="cursor-grab text-white/25">⠿</span>
                      <span className="truncate">{node.label}</span>
                      <span className="ml-auto text-[10px] text-white/25">{node.locked ? "⌕" : node.visible ? "●" : "○"}</span>
                    </button>
                  ))}
                  {!activePage.nodes.length && <p className="rounded-lg border border-dashed border-white/10 p-3 text-center text-[11px] text-white/30">Insira o primeiro bloco.</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-3">
              {BLOCKS.map((block) => (
                <button key={block.type} onClick={() => addBlock(block.type, block.label)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:border-violet-400/50 hover:bg-violet-400/5">
                  <span className="mb-3 block text-lg text-violet-300">◇</span>
                  <span className="block text-xs font-semibold">{block.label}</span>
                  <span className="mt-1 block text-[10px] leading-tight text-white/35">{block.hint}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col bg-[#0c0c0e]">
          <div className="flex h-12 shrink-0 items-center justify-center gap-1 border-b border-white/10 bg-[#151517]">
            {(["desktop", "tablet", "mobile"] as Device[]).map((item) => (
              <button key={item} onClick={() => setDevice(item)} className={`rounded-md px-3 py-1.5 text-xs ${device === item ? "bg-white/10 text-white" : "text-white/35 hover:text-white"}`}>
                {item === "desktop" ? "Desktop" : item === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
            <span className="mx-2 h-4 w-px bg-white/10" />
            <span className="text-[10px] text-white/30">100%</span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_center,rgba(139,92,246,.08),transparent_50%)] p-3 sm:p-5">
            <div className={`mx-auto h-full min-h-[520px] ${DEVICE_WIDTH[device]} overflow-hidden rounded-xl border border-white/15 bg-black shadow-[0_30px_100px_rgba(0,0,0,.65)] transition-[max-width] duration-300`}>
              <iframe
                ref={previewRef}
                src={`/admin/preview?page=${encodeURIComponent(activePage.id)}`}
                title="Previa real do site"
                className="h-full w-full border-0 bg-black"
              />
            </div>
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-[#171719]">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold">Design</div>
          {selected ? (
            <div className="space-y-5 p-4">
              <Property label="Nome">
                <input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-violet-400/60" />
              </Property>
              <Property label="Largura">
                <div className="grid grid-cols-2 gap-1">
                  {(["half", "full"] as const).map((width) => (
                    <button key={width} onClick={() => updateSelected({ width })} className={`rounded-lg px-2 py-2 text-xs ${selected.width === width ? "bg-violet-500 text-white" : "border border-white/10 text-white/45"}`}>
                      {width === "half" ? "½ Coluna" : "Total"}
                    </button>
                  ))}
                </div>
              </Property>
              <Property label="Estado">
                <div className="grid grid-cols-2 gap-1">
                  <button onClick={() => updateSelected({ visible: !selected.visible })} className="rounded-lg border border-white/10 px-2 py-2 text-xs text-white/60">{selected.visible ? "Visível" : "Oculto"}</button>
                  <button onClick={() => updateSelected({ locked: !selected.locked })} className="rounded-lg border border-white/10 px-2 py-2 text-xs text-white/60">{selected.locked ? "Bloqueado" : "Livre"}</button>
                </div>
              </Property>
              <Property label="Alinhamento">
                <div className="grid grid-cols-3 gap-1">
                  {(["left", "center", "right"] as const).map((alignment) => (
                    <button
                      key={alignment}
                      onClick={() => updateSelected({ alignment })}
                      className={`rounded-lg border py-2 text-xs ${(selected.alignment ?? "left") === alignment ? "border-violet-400/60 bg-violet-400/15 text-violet-100" : "border-white/10 text-white/40 hover:bg-white/5"}`}
                    >
                      {alignment === "left" ? "←" : alignment === "center" ? "↔" : "→"}
                    </button>
                  ))}
                </div>
              </Property>
              <div className="border-t border-white/10 pt-4">
                <button onClick={() => { updateNodes((nodes) => nodes.filter((node) => node.id !== selected.id)); setSelectedId(null); }} className="w-full rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10">Excluir elemento</button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-white/30">Selecione uma camada para editar suas propriedades.</div>
          )}
          <div className="border-t border-white/10 p-4">
            <Property label="Navegação">
              <select value={document.navPosition} onChange={(event) => setDocument((current) => ({ ...current, navPosition: event.target.value as "top" | "left" }))} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs">
                <option value="top">Topo</option>
                <option value="left">Lateral</option>
              </select>
            </Property>
          </div>
        </aside>
      </div>
      {saveState === "error" && <p className="mt-2 text-xs text-red-400">{message}</p>}
      <AdminWorkspaceOverlay view={workspaceView} onChangeView={setWorkspaceView} onClose={() => setWorkspaceView(null)} />
    </div>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <span className="block text-[10px] font-bold uppercase tracking-widest text-white/35">{children}</span>;
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <PanelTitle>{label}</PanelTitle>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
