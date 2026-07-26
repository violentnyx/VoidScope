import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

// Fora da navegação de propósito (não entra em content.nav) e marcada
// noindex — mesma lógica que já usávamos no site antigo em /Admin.
export const metadata: Metadata = {
  title: "Nyx_aim — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
