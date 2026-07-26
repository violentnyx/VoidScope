import { EquipmentInlineEditor } from "@/components/equipment-inline-editor";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { getPagesStatus } from "@/lib/get-content";
import { getEquipmentData } from "@/lib/equipment-store";
import { isAdminRequest } from "@/lib/is-admin-request";

export default async function EquipmentPage() {
  const pages = await getPagesStatus();
  const isAdmin = await isAdminRequest();
  if (pages.equipment === "staging" && !isAdmin) return <MaintenanceScreen />;
  const equipment = await getEquipmentData();
  return <div><h1 className="text-2xl font-bold sm:text-3xl">Equipment</h1><p className="mt-2 mb-8 max-w-xl text-sm text-white/60">{equipment.lead}</p><EquipmentInlineEditor initial={equipment} isAdmin={isAdmin} /></div>;
}
