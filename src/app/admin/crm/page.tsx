import type { Metadata } from "next";
import { CrmDashboard } from "@/components/crm-dashboard";

export const metadata: Metadata = { title: "Nyx_aim — CRM", robots: { index: false, follow: false } };
export default function CrmPage() { return <CrmDashboard />; }
