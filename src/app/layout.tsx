import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import { ShaderBackground } from "@/components/shader-background";
import { SiteNav } from "@/components/site-nav";
import { ScrollSound } from "@/components/scroll-sound";
import { SiteFooter } from "@/components/site-footer";
import { SiteIntro } from "@/components/intro/site-intro";
import { getContent, getPagesStatus, PAGE_ROUTES } from "@/lib/get-content";
import { isAdminRequest } from "@/lib/is-admin-request";
import { getSiteSettings } from "@/lib/site-settings-store";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Nyx_aim",
  description: "Filmmaker. Links, redes e canais.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [content, pagesStatus, isAdmin, siteSettings] = await Promise.all([
    getContent(),
    getPagesStatus(),
    isAdminRequest(),
    getSiteSettings(),
  ]);

  // Página em Staging some do header pra quem não é admin — quem
  // ainda vê o conteúdo normal (o próprio admin) continua com o link.
  const stagingRoutes = isAdmin
    ? new Set<string>()
    : new Set(
        Object.entries(pagesStatus)
          .filter(([, status]) => status === "staging")
          .map(([id]) => PAGE_ROUTES[id as keyof typeof PAGE_ROUTES])
      );
  const navItems = content.nav.filter((item) => !stagingRoutes.has(item.href));

  return (
    <html lang="pt-BR" className={`${mono.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans text-white antialiased">
        <SiteIntro enabled={siteSettings.introEnabled ?? true} />
        <ShaderBackground />
        <ScrollSound />
        <div className="site-content-shell flex min-h-screen flex-1 flex-col">
          <SiteNav brand={content.brand} items={navItems} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
            {children}
          </main>
          <SiteFooter brand={content.brand} />
        </div>
      </body>
    </html>
  );
}
