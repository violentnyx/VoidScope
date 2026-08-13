"use client";

import { useEffect, useState } from "react";
import { EquipmentInlineEditor } from "@/components/equipment-inline-editor";
import { ProjectsManager } from "@/components/projects-manager";
import type { ListPageContent } from "@/content/types";
import type { ProjectRecord } from "@/lib/projects-store";

export function AdminContentWorkspace() {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);
  const [equipment, setEquipment] = useState<ListPageContent | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/projects", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Projetos");
        return response.json() as Promise<ProjectRecord[]>;
      }),
      fetch("/api/admin/equipment", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Equipamentos");
        return response.json() as Promise<ListPageContent>;
      }),
    ])
      .then(([projectData, equipmentData]) => {
        setProjects(projectData);
        setEquipment(equipmentData);
      })
      .catch(() => setError("Não foi possível carregar os gerenciadores de conteúdo."));
  }, []);

  return (
    <div className="pb-12">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet-300/80">Conteúdo do site</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Projetos e equipamentos</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">Crie, publique e organize o conteúdo das páginas sem sair do Admin Studio.</p>
      </header>
      {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <section id="admin-projects" className="mb-12 scroll-mt-6">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div><h2 className="text-sm font-bold uppercase tracking-wide text-white/80">Projetos</h2><p className="mt-1 text-xs text-white/40">Ordem, publicação e conteúdo em Markdown.</p></div>
          <a href="/projects" target="_blank" rel="noreferrer" className="text-xs text-white/45 hover:text-white">Abrir página ↗</a>
        </div>
        {projects ? <ProjectsManager initial={projects} isAdmin /> : <LoadingCard />}
      </section>

      <section id="admin-equipment" className="scroll-mt-6">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div><h2 className="text-sm font-bold uppercase tracking-wide text-white/80">Equipamentos</h2><p className="mt-1 text-xs text-white/40">Categorias e itens exibidos no setup.</p></div>
          <a href="/equipment" target="_blank" rel="noreferrer" className="text-xs text-white/45 hover:text-white">Abrir página ↗</a>
        </div>
        {equipment ? <EquipmentInlineEditor initial={equipment} isAdmin /> : <LoadingCard />}
      </section>
    </div>
  );
}

function LoadingCard() {
  return <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-8 text-sm text-white/40">Carregando…</div>;
}
