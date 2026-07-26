import { NextRequest, NextResponse } from "next/server";
import { getProjects, saveProjects, slugify, type ProjectRecord } from "@/lib/projects-store";

export async function GET() {
  return NextResponse.json(await getProjects());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projects = await getProjects();
  const now = new Date().toISOString();
  const title = String(body.title || "Novo projeto").trim();
  let slug = slugify(String(body.slug || title));
  if (projects.some((p) => p.slug === slug)) slug = `${slug}-${Date.now()}`;
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    slug,
    title,
    summary: String(body.summary || ""),
    year: String(body.year || new Date().getFullYear()),
    markdown: String(body.markdown || `# ${title}\n\nEscreva o projeto aqui.`),
    isPrivate: Boolean(body.isPrivate),
    order: projects.length,
    createdAt: now,
    updatedAt: now,
  };
  await saveProjects([...projects, project]);
  return NextResponse.json(project, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const projects = await getProjects();
  if (Array.isArray(body.projects)) {
    return NextResponse.json(await saveProjects(body.projects as ProjectRecord[]));
  }
  const index = projects.findIndex((p) => p.id === body.id);
  if (index < 0) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  const next = { ...projects[index], ...body, updatedAt: new Date().toISOString() } as ProjectRecord;
  if (!next.title.trim()) return NextResponse.json({ error: "Título obrigatório." }, { status: 400 });
  next.slug = slugify(next.slug || next.title);
  projects[index] = next;
  return NextResponse.json((await saveProjects(projects))[index]);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const projects = await getProjects();
  await saveProjects(projects.filter((p) => p.id !== id));
  return NextResponse.json({ ok: true });
}
