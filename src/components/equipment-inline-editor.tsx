"use client";

import { useState } from "react";
import type { ListPageContent } from "@/content/types";
import { RowSectionBlock } from "@/components/row-list";

export function EquipmentInlineEditor({ initial, isAdmin }: { initial: ListPageContent; isAdmin: boolean }) {
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/equipment", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setSaving(false);
    if (response.ok) setEditing(false); else alert("Não foi possível salvar.");
  }

  if (!editing) return <>
    {isAdmin && <button onClick={() => setEditing(true)} className="admin-action mb-5">Editar equipamentos</button>}
    {data.sections.map((section, i) => <RowSectionBlock key={`${section.heading}-${i}`} section={section} />)}
  </>;

  return <div className="admin-inline-panel">
    <label>Introdução<textarea value={data.lead} onChange={(e) => setData({ ...data, lead: e.target.value })} /></label>
    {data.sections.map((section, sectionIndex) => <section key={sectionIndex} className="admin-editor-section">
      <div className="admin-editor-row">
        <input placeholder="Nome da categoria" value={section.heading || ""} onChange={(e) => { const sections = [...data.sections]; sections[sectionIndex] = { ...section, heading: e.target.value }; setData({ ...data, sections }); }} />
        <button onClick={() => setData({ ...data, sections: data.sections.filter((_, i) => i !== sectionIndex) })}>Excluir categoria</button>
      </div>
      {section.items.map((item, itemIndex) => <div key={itemIndex} className="admin-equipment-item">
        <input placeholder="Item" value={item.title} onChange={(e) => { const sections = structuredClone(data.sections); sections[sectionIndex].items[itemIndex].title = e.target.value; setData({ ...data, sections }); }} />
        <input placeholder="Modelo / detalhe" value={item.meta || ""} onChange={(e) => { const sections = structuredClone(data.sections); sections[sectionIndex].items[itemIndex].meta = e.target.value; setData({ ...data, sections }); }} />
        <input placeholder="Descrição opcional" value={item.desc || ""} onChange={(e) => { const sections = structuredClone(data.sections); sections[sectionIndex].items[itemIndex].desc = e.target.value; setData({ ...data, sections }); }} />
        <button onClick={() => { const sections = structuredClone(data.sections); sections[sectionIndex].items.splice(itemIndex, 1); setData({ ...data, sections }); }}>×</button>
      </div>)}
      <button onClick={() => { const sections = structuredClone(data.sections); sections[sectionIndex].items.push({ title: "Novo item", meta: "" }); setData({ ...data, sections }); }}>Adicionar item</button>
    </section>)}
    <button onClick={() => setData({ ...data, sections: [...data.sections, { heading: "Nova categoria", items: [] }] })}>Adicionar categoria</button>
    <div className="admin-editor-actions"><button onClick={() => { setData(initial); setEditing(false); }}>Cancelar</button><button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div>
  </div>;
}
