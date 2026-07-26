/**
 * Ids e rotas das páginas controladas pelo grupo "Páginas" do painel
 * Admin. Vive num módulo separado (sem `fs`/`path`) de propósito: é
 * importado tanto por código de servidor (get-content.ts, as próprias
 * páginas) quanto pelo admin-dashboard.tsx, que é um Client Component
 * — se isso estivesse junto de get-content.ts, o bundle do navegador
 * puxaria junto o content-store.ts (que usa `fs/promises`) e quebraria
 * o build.
 */

export const KNOWN_PAGE_IDS = ["home", "projects", "equipment", "gallery", "contact"] as const;
export type PageId = (typeof KNOWN_PAGE_IDS)[number];

/** Rota pública de cada página — usado pra tirar do header (nav) a
 * página que estiver em Staging. */
export const PAGE_ROUTES: Record<PageId, string> = {
  home: "/",
  projects: "/projects",
  equipment: "/equipment",
  gallery: "/gallery",
  contact: "/contact-me",
};
