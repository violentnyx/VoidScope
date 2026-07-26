"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectRecord } from "@/lib/projects-store";

export function ProjectsManager({ initial, isAdmin }: { initial: ProjectRecord[]; isAdmin: boolean }) {
  const [projects, setProjects] = useState(initial);
  const [editing, setEditing] = useState<ProjectRecord | null>(null);

  async function reload() { setProjects(await (await fetch("/api/admin/projects")).json()); }
  async function create() {
    const response = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Novo projeto", isPrivate: true }) });
    const project = await response.json(); await reload(); setEditing(project);
  }
  async function save(project: ProjectRecord) {
    const response = await fetch("/api/admin/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
    if (!response.ok) return alert("Não foi possível salvar.");
    setEditing(null); await reload();
  }
  async function remove(id: string) {
    if (!confirm("Excluir este projeto?")) return;
    await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await reload();
  }
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= projects.length) return;
    const next = [...projects]; [next[index], next[target]] = [next[target], next[index]]; setProjects(next);
    await fetch("/api/admin/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projects: next }) });
  }

  const visible = isAdmin ? projects : projects.filter((p) => !p.isPrivate);
  return <div>
    {isAdmin && <button className="admin-action mb-5" onClick={create}>Criar projeto</button>}
    <div className="flex flex-col gap-3">
      {visible.map((project) => {
        const index = projects.findIndex((p) => p.id === project.id);
        return <div key={project.id} className="project-admin-row">
          <Link href={`/projects/${project.slug}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><strong>{project.title}</strong>{project.isPrivate && <span className="private-badge">Privado</span>}</div>
            {project.summary && <p>{project.summary}</p>}<small>{project.year}</small>
          </Link>
          {isAdmin && <div className="project-controls"><button onClick={() => move(index, -1)}>↑</button><button onClick={() => move(index, 1)}>↓</button><button onClick={() => setEditing(project)}>Editar</button><button onClick={() => save({ ...project, isPrivate: !project.isPrivate })}>{project.isPrivate ? "Publicar" : "Privar"}</button><button onClick={() => remove(project.id)}>Excluir</button></div>}
        </div>;
      })}
    </div>
    {editing && <div className="project-modal-backdrop"><div className="project-modal">
      <h2>Editar projeto</h2>
      <label>Título<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
      <label>Slug<input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></label>
      <label>Resumo<textarea value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></label>
      <label>Ano<input value={editing.year} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={editing.isPrivate} onChange={(e) => setEditing({ ...editing, isPrivate: e.target.checked })} /> Projeto privado</label>
      <label>Markdown<textarea className="markdown-editor" value={editing.markdown} onChange={(e) => setEditing({ ...editing, markdown: e.target.value })} /></label>
      <div className="admin-editor-actions"><button onClick={() => setEditing(null)}>Cancelar</button><button onClick={() => save(editing)}>Salvar</button></div>
    </div></div>}
  </div>;
}
