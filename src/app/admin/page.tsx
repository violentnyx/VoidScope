import type { Metadata } from "next";
import { AdminLayoutEditor } from "@/components/admin-layout-editor";

// Fora da navegação de propósito (não entra em content.nav) e marcada
// noindex — mesma lógica que já usávamos no site antigo em /Admin.
export const metadata: Metadata = {
  title: "Nyx_aim — Admin Studio",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminLayoutEditor />;
}
