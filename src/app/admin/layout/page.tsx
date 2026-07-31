import type { Metadata } from "next";
import { AdminLayoutEditor } from "@/components/admin-layout-editor";

export const metadata: Metadata = {
  title: "Editor de Layout — Nyx_aim Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayoutPage() {
  return <AdminLayoutEditor />;
}
