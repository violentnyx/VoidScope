import { notFound } from "next/navigation";
import Link from "next/link";
import { MarkdownContent } from "@/components/markdown-content";
import { getProjects } from "@/lib/projects-store";
import { isAdminRequest } from "@/lib/is-admin-request";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = (await getProjects()).find((item) => item.slug === slug);
  const isAdmin = await isAdminRequest();
  if (!project || (project.isPrivate && !isAdmin)) notFound();
  return <div><Link href="/projects" className="text-sm text-white/60 hover:text-white">← Voltar aos projetos</Link><div className="mt-7 mb-8"><div className="flex items-center gap-3"><h1 className="text-3xl font-bold">{project.title}</h1>{project.isPrivate && <span className="private-badge">Privado</span>}</div>{project.summary && <p className="mt-3 max-w-2xl text-white/60">{project.summary}</p>}<p className="mt-2 text-xs text-white/40">{project.year}</p></div><MarkdownContent source={project.markdown} /></div>;
}
