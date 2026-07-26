import { ProjectsManager } from "@/components/projects-manager";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getPagesStatus } from "@/lib/get-content";
import { getProjects } from "@/lib/projects-store";
import { isAdminRequest } from "@/lib/is-admin-request";

export default async function ProjectsPage() {
  const pages = await getPagesStatus();
  const isAdmin = await isAdminRequest();
  if (pages.projects === "staging" && !isAdmin) return <MaintenanceScreen />;
  const projects = await getProjects();
  return <div><h1 className="text-2xl font-bold sm:text-3xl">Projects</h1><p className="mt-2 mb-8 max-w-xl text-sm text-white/60">Trabalhos autorais, estudos e projetos documentados em Markdown.</p><ProjectsManager initial={projects} isAdmin={isAdmin} /></div>;
}
