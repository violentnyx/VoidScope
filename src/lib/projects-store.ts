import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface ProjectRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  year: string;
  markdown: string;
  isPrivate: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "projects.json");

const defaults: ProjectRecord[] = [
  {
    id: "project-example",
    slug: "meu-primeiro-projeto",
    title: "Meu primeiro projeto",
    summary: "Projeto em Markdown, pronto para editar pelo painel inline.",
    year: "2026",
    markdown: "# Meu primeiro projeto\n\nEscreva aqui usando **Markdown**. Você pode copiar o conteúdo diretamente do Obsidian.\n\n## Sobre\n\n- Objetivo do projeto\n- Ferramentas usadas\n- Resultados",
    isPrivate: false,
    order: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

export async function getProjects(): Promise<ProjectRecord[]> {
  try {
    const data = JSON.parse(await readFile(FILE_PATH, "utf-8")) as ProjectRecord[];
    return data.sort((a, b) => a.order - b.order);
  } catch {
    return defaults;
  }
}

export async function saveProjects(projects: ProjectRecord[]): Promise<ProjectRecord[]> {
  const normalized = projects.map((project, index) => ({ ...project, order: index }));
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `projeto-${Date.now()}`;
}
