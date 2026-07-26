import { GalleryManager } from "@/components/gallery-manager";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getGallery } from "@/lib/gallery-store";
import { getPagesStatus } from "@/lib/get-content";
import { isAdminRequest } from "@/lib/is-admin-request";

export default async function GalleryPage() {
  const [gallery, pages, isAdmin] = await Promise.all([getGallery(), getPagesStatus(), isAdminRequest()]);
  if (pages.gallery === "staging" && !isAdmin) return <MaintenanceScreen />;
  return <div><h1 className="text-2xl font-bold sm:text-3xl">{gallery.title}</h1><p className="mt-2 mb-8 max-w-xl text-sm text-white/60">{gallery.lead}</p><GalleryManager initial={gallery} isAdmin={isAdmin}/></div>;
}
