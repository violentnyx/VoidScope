import Link from "next/link";

export function AdminNav({ active }: { active: "content" | "crm" | "layout" }) {
  const items: Array<{ id: "content" | "crm" | "layout"; href: string; label: string; suffix?: string }> = [
    { id: "content", href: "/admin", label: "Admin Studio" },
    { id: "crm", href: "/admin/crm", label: "CRM e pipeline" },
    { id: "layout", href: "/admin/layout", label: "Editor de Layout", suffix: "Alpha" },
  ];
  return <nav className="mb-8 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/60 p-2">{items.map((item) => <Link key={item.id} href={item.href} className={["rounded-lg px-4 py-2 text-xs font-bold transition", active === item.id ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white"].join(" ")}>{item.label}{item.suffix && <span className="ml-1 text-violet-300">{item.suffix}</span>}</Link>)}</nav>;
}
