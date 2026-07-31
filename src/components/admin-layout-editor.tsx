"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  const [document, setDocument] = useState<LayoutDocument>(DEFAULT_LAYOUT_DOCUMENT);
  const [pageId, setPageId] = useState("home");
  const [selectedId, setSelectedId] = useState<string | null>("identity");
  const [device, setDevice] = useState<Device>("desktop");
  const [leftTab, setLeftTab] = useState<"layers" | "insert">("layers");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("Carregando rascunho…");

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
    const id = `${type}-${Date.now()}`;
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
    const id = `page-${Date.now()}`;
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
    <div className="relative left-1/2 w-[calc(100vw-1rem)] max-w-[1540px] -translate-x-1/2 px-2">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-white/45 hover:text-white">Admin</Link>
            <span className="text-white/20">/</span>
            <h1 className="text-lg font-bold">Editor de Layout</h1>
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">Alpha</span>
          </div>
          <p className="mt-1 text-xs text-white/45">{message}</p>
        </div>
        <a href="/3jstest" target="_blank" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/10">Abrir teste ↗</a>
        <button onClick={() => save("draft")} disabled={saveState === "saving"} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40">
          {saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : "Salvar rascunho"}
        </button>
        <button onClick={() => save("publish")} disabled={saveState === "saving"} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold hover:bg-violet-400 disabled:opacity-40">Publicar</button>
      </header>

      <div className="grid min-h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-[#111113] shadow-2xl lg:grid-cols-[230px_minmax(0,1fr)_250px]">
        <aside className="border-b border-white/10 bg-[#171719] lg:border-r lg:border-b-0">
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

        <main className="min-w-0 bg-[#0c0c0e]">
          <div className="flex h-12 items-center justify-center gap-1 border-b border-white/10 bg-[#151517]">
            {(["desktop", "tablet", "mobile"] as Device[]).map((item) => (
              <button key={item} onClick={() => setDevice(item)} className={`rounded-md px-3 py-1.5 text-xs ${device === item ? "bg-white/10 text-white" : "text-white/35 hover:text-white"}`}>
                {item === "desktop" ? "Desktop" : item === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
            <span className="mx-2 h-4 w-px bg-white/10" />
            <span className="text-[10px] text-white/30">100%</span>
          </div>
          <div className="h-[668px] overflow-auto bg-[radial-gradient(circle_at_center,rgba(139,92,246,.08),transparent_50%)] p-4 sm:p-8">
            <div className={`mx-auto min-h-[600px] ${DEVICE_WIDTH[device]} rounded-xl border border-white/15 bg-black p-4 shadow-[0_30px_100px_rgba(0,0,0,.65)] transition-[max-width] duration-300`}>
              <div className="mb-8 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-xs font-bold">VOID</span>
                <span className="text-[10px] text-white/35">Navegação · {document.navPosition === "top" ? "Topo" : "Lateral"}</span>
              </div>
              <div className={`grid grid-cols-1 gap-3 ${device !== "mobile" ? "sm:grid-cols-2" : ""}`}>
                {activePage.nodes.filter((node) => node.visible).map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedId(node.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveBefore(node.id)}
                    className={[
                      "relative min-h-32 rounded-xl border p-4 text-left transition",
                      node.width === "full" && device !== "mobile" ? "sm:col-span-2" : "",
                      selectedId === node.id ? "border-violet-400 bg-violet-400/10 ring-2 ring-violet-400/20" : "border-white/10 bg-white/[.035] hover:border-white/25",
                    ].join(" ")}
                  >
                    {selectedId === node.id && <span className="absolute -top-2 left-3 rounded bg-violet-500 px-1.5 py-0.5 text-[9px] font-bold uppercase">{node.type}</span>}
                    <span className="block text-sm font-bold">{node.label}</span>
                    <span className="mt-1 block text-[10px] text-white/35">{node.width === "full" ? "Largura total" : "Meia largura"}</span>
                    <span className="mt-5 block h-10 rounded-lg bg-white/[.035]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>

        <aside className="border-t border-white/10 bg-[#171719] lg:border-t-0 lg:border-l">
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
                  {["←", "↔", "→"].map((symbol) => <button key={symbol} className="rounded-lg border border-white/10 py-2 text-xs text-white/40 hover:bg-white/5">{symbol}</button>)}
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
