"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { CRM_STAGES, type CrmActivity, type CrmData, type CrmLead, type CrmStage } from "@/lib/crm-types";

const STAGE_LABELS: Record<CrmStage, string> = { novo: "Novo", contato: "Contato", qualificado: "Qualificado", simulacao: "Simulação", negociacao: "Negociação", convertido: "Convertido", perdido: "Perdido" };
const INTERESTS = ["Imóvel", "Veículo", "Serviço", "Planejamento patrimonial", "Outro"];
const inputClass = "w-full rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white outline-none transition focus:border-white/35";

function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value); }
function localDate(value: string) { if (!value) return "Sem data"; return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }

export function CrmDashboard({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<CrmData>({ leads: [], activities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<CrmStage | "todos">("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [renderedAt] = useState(() => Date.now());
  useEffect(() => {
    fetch("/api/admin/crm", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Não consegui carregar o CRM.");
        return response.json();
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Falha ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  const selected = data.leads.find((lead) => lead.id === selectedId) ?? null;
  const filtered = useMemo(() => data.leads.filter((lead) => {
    const matchesStage = stageFilter === "todos" || lead.stage === stageFilter;
    const haystack = `${lead.name} ${lead.instagram} ${lead.phone} ${lead.interest} ${lead.sourceContent}`.toLowerCase();
    return matchesStage && haystack.includes(query.toLowerCase());
  }), [data.leads, query, stageFilter]);
  const active = data.leads.filter((lead) => !["convertido", "perdido"].includes(lead.stage));
  const pipeline = active.reduce((sum, lead) => sum + lead.creditValue, 0);
  const due = active.filter((lead) => lead.nextActionAt && new Date(lead.nextActionAt).getTime() <= renderedAt).length;
  const conversions = data.leads.filter((lead) => lead.stage === "convertido").length;

  async function updateLead(id: string, patch: Partial<CrmLead>) {
    const response = await fetch("/api/admin/crm", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao atualizar.");
    setData((current) => ({ ...current, leads: current.leads.map((lead) => lead.id === id ? result : lead) }));
  }

  return <div className={embedded ? "pb-12" : ""}>
    <header className="mb-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300/80">Relacionamento e vendas</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">CRM</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">Acompanhe os leads que chegam pelos conteúdos, organize retornos e enxergue o valor do pipeline.</p>
    </header>
    {!embedded && <AdminNav active="crm" />}

    {error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Leads ativos" value={String(active.length)} hint={`${data.leads.length} no total`} />
      <Metric label="Pipeline" value={money(pipeline)} hint="Cartas em aberto" />
      <Metric label="Ações atrasadas" value={String(due)} hint={due ? "Precisam de atenção" : "Tudo em dia"} alert={due > 0} />
      <Metric label="Convertidos" value={String(conversions)} hint={data.leads.length ? `${Math.round((conversions / data.leads.length) * 100)}% da base` : "Sem histórico"} />
    </section>

    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      {CRM_STAGES.map((stage) => <button key={stage} onClick={() => setStageFilter(stageFilter === stage ? "todos" : stage)} className={["rounded-xl border p-3 text-left transition", stageFilter === stage ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-black/55 hover:border-white/25"].join(" ")}><span className="block text-xs text-white/50">{STAGE_LABELS[stage]}</span><span className="mt-1 block text-xl font-bold">{data.leads.filter((lead) => lead.stage === stage).length}</span></button>)}
    </section>

    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, Instagram, interesse ou conteúdo…" className={inputClass} />
      <button onClick={() => setShowForm((value) => !value)} className="shrink-0 rounded-lg bg-white px-5 py-2 text-sm font-bold text-black transition hover:opacity-85">{showForm ? "Fechar" : "+ Novo lead"}</button>
    </div>
    {showForm && <LeadForm onCreated={(lead) => { setData((current) => ({ ...current, leads: [lead, ...current.leads] })); setSelectedId(lead.id); setShowForm(false); }} />}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-black/55">
        {loading ? <p className="p-6 text-sm text-white/50">Carregando CRM…</p> : filtered.length === 0 ? <div className="p-8 text-center"><p className="font-semibold">Nenhum lead encontrado</p><p className="mt-1 text-sm text-white/45">Cadastre o primeiro lead ou limpe os filtros.</p></div> : <div className="divide-y divide-white/10">{filtered.map((lead) => <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} onSelect={() => setSelectedId(lead.id)} onStage={(stage) => updateLead(lead.id, { stage }).catch((reason) => setError(reason.message))} />)}</div>}
      </section>
      <aside className="rounded-xl border border-white/10 bg-black/55 p-4 xl:sticky xl:top-4 xl:self-start">
        {selected ? <LeadDetails lead={selected} activities={data.activities.filter((activity) => activity.leadId === selected.id)} onUpdated={(lead) => setData((current) => ({ ...current, leads: current.leads.map((item) => item.id === lead.id ? lead : item) }))} onActivity={(activity) => setData((current) => ({ ...current, activities: [activity, ...current.activities] }))} onDeleted={() => { setData((current) => ({ leads: current.leads.filter((lead) => lead.id !== selected.id), activities: current.activities.filter((activity) => activity.leadId !== selected.id) })); setSelectedId(null); }} /> : <div className="py-12 text-center text-sm text-white/45">Selecione um lead para ver detalhes e registrar interações.</div>}
      </aside>
    </div>
  </div>;
}

function Metric({ label, value, hint, alert = false }: { label: string; value: string; hint: string; alert?: boolean }) { return <div className={["rounded-xl border bg-black/55 p-4", alert ? "border-amber-400/35" : "border-white/10"].join(" ")}><p className="text-xs text-white/50">{label}</p><p className="mt-2 truncate text-xl font-bold sm:text-2xl">{value}</p><p className={["mt-1 text-xs", alert ? "text-amber-300" : "text-white/35"].join(" ")}>{hint}</p></div>; }

function LeadRow({ lead, selected, onSelect, onStage }: { lead: CrmLead; selected: boolean; onSelect: () => void; onStage: (stage: CrmStage) => void }) { const [renderedAt] = useState(() => Date.now()); return <div className={["grid gap-3 p-4 transition sm:grid-cols-[minmax(0,1fr)_150px_130px] sm:items-center", selected ? "bg-white/10" : "hover:bg-white/[0.04]"].join(" ")}><button onClick={onSelect} className="min-w-0 text-left"><span className="block truncate font-semibold">{lead.name}</span><span className="mt-1 block truncate text-xs text-white/45">{lead.instagram || lead.phone || "Sem contato"} · {lead.interest || "Interesse não informado"}</span>{lead.sourceContent && <span className="mt-1 block truncate font-mono text-[10px] text-cyan-300/70">Origem: {lead.sourceContent}</span>}</button><select value={lead.stage} onChange={(event) => onStage(event.target.value as CrmStage)} className={inputClass}>{CRM_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select><button onClick={onSelect} className="text-left sm:text-right"><span className="block text-sm font-semibold">{lead.creditValue ? money(lead.creditValue) : "Sem valor"}</span><span className={lead.nextActionAt && new Date(lead.nextActionAt).getTime() <= renderedAt ? "text-[10px] text-amber-300" : "text-[10px] text-white/35"}>{lead.nextActionAt ? localDate(lead.nextActionAt) : "Sem próxima ação"}</span></button></div>; }

function LeadForm({ onCreated }: { onCreated: (lead: CrmLead) => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const values = Object.fromEntries(new FormData(event.currentTarget)); try { const response = await fetch("/api/admin/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); onCreated(result); } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao cadastrar."); } finally { setSaving(false); } }
  return <form onSubmit={submit} className="mb-5 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.04] p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Field name="name" label="Nome *" required /><Field name="instagram" label="Instagram" placeholder="@usuario" /><Field name="phone" label="WhatsApp" /><label className="text-xs text-white/55">Interesse<select name="interest" className={`${inputClass} mt-1`}><option value="">Selecione</option>{INTERESTS.map((item) => <option key={item}>{item}</option>)}</select></label><Field name="creditValue" label="Valor da carta" type="number" /><Field name="sourceContent" label="Conteúdo de origem" placeholder="RE01, CA03…" /><Field name="nextAction" label="Próxima ação" placeholder="Enviar simulação" /><Field name="nextActionAt" label="Quando" type="datetime-local" /></div>{error && <p className="mt-3 text-xs text-red-300">{error}</p>}<button disabled={saving} className="mt-4 rounded-lg bg-cyan-200 px-5 py-2 text-sm font-bold text-black disabled:opacity-50">{saving ? "Salvando…" : "Cadastrar lead"}</button></form>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="text-xs text-white/55">{label}<input {...props} className={`${inputClass} mt-1`} /></label>; }

function LeadDetails({ lead, activities, onUpdated, onActivity, onDeleted }: { lead: CrmLead; activities: CrmActivity[]; onUpdated: (lead: CrmLead) => void; onActivity: (activity: CrmActivity) => void; onDeleted: () => void }) {
  const [activity, setActivity] = useState(""); const [saving, setSaving] = useState(false);
  async function patch(fields: Partial<CrmLead>) { const response = await fetch("/api/admin/crm", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, ...fields }) }); const result = await response.json(); if (response.ok) onUpdated(result); }
  async function addActivity(event: FormEvent) { event.preventDefault(); if (!activity.trim()) return; setSaving(true); const response = await fetch("/api/admin/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "activity", leadId: lead.id, type: "nota", description: activity }) }); const result = await response.json(); if (response.ok) { onActivity(result); setActivity(""); } setSaving(false); }
  async function remove() { if (!window.confirm(`Excluir ${lead.name} e todo o histórico?`)) return; const response = await fetch(`/api/admin/crm?id=${lead.id}`, { method: "DELETE" }); if (response.ok) onDeleted(); }
  return <div><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{lead.name}</p><p className="mt-1 text-xs text-white/45">{lead.instagram || "Sem Instagram"} · {lead.phone || "Sem WhatsApp"}</p></div><button onClick={remove} className="text-xs text-red-300/70 hover:text-red-200">Excluir</button></div><div className="mt-5 grid gap-3"><label className="text-xs text-white/50">Próxima ação<input value={lead.nextAction} onChange={(event) => onUpdated({ ...lead, nextAction: event.target.value })} onBlur={(event) => void patch({ nextAction: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs text-white/50">Data<input type="datetime-local" value={lead.nextActionAt.slice(0, 16)} onChange={(event) => { onUpdated({ ...lead, nextActionAt: event.target.value }); void patch({ nextActionAt: event.target.value }); }} className={`${inputClass} mt-1`} /></label><label className="text-xs text-white/50">Observações<textarea value={lead.notes} onChange={(event) => onUpdated({ ...lead, notes: event.target.value })} onBlur={(event) => void patch({ notes: event.target.value })} rows={3} className={`${inputClass} mt-1 resize-y`} /></label></div><form onSubmit={addActivity} className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">Registrar interação</p><textarea value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Ex.: respondeu no Direct e pediu simulação…" rows={2} className={`${inputClass} resize-y`} /><button disabled={saving} className="mt-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white hover:text-black">Adicionar ao histórico</button></form><div className="mt-5 space-y-3">{activities.slice(0, 8).map((item) => <div key={item.id} className="border-l border-white/15 pl-3"><p className="text-xs text-white/75">{item.description}</p><p className="mt-1 text-[10px] text-white/35">{localDate(item.occurredAt)}</p></div>)}{activities.length === 0 && <p className="text-xs text-white/35">Nenhuma interação registrada.</p>}</div></div>;
}
