import { LayoutSitePreview } from "@/components/layout-site-preview";
import { getContent } from "@/lib/get-content";
import { getStoredLayouts } from "@/lib/layout-editor-store";

export default async function AdminLayoutPreviewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const [{ draft }, site, params] = await Promise.all([
    getStoredLayouts(),
    getContent(),
    searchParams,
  ]);
  return <LayoutSitePreview initialDocument={draft} initialPageId={params.page ?? draft.pages[0]?.id ?? "home"} brand={site.brand} navItems={site.nav} home={site.home} contact={site.contact} />;
}
