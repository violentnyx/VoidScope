"use client";

import { useState } from "react";
import type { GalleryData, GalleryItem } from "@/lib/gallery-store";
import { playUISound } from "@/lib/site-sounds";

export function GalleryManager({ initial, isAdmin, adminMode = false }: { initial: GalleryData; isAdmin: boolean; adminMode?: boolean }) {
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(adminMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function patchItem(index: number, patch: Partial<GalleryItem>) {
    setData((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  }
  function addItem() {
    playUISound("press");
    setData((current) => ({ ...current, items: [...current.items, { id: crypto.randomUUID(), title: "Nova imagem", imageUrl: "", description: "", alt: "", linkUrl: "", private: false }] }));
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= data.items.length) return;
    const items = [...data.items];
    [items[index], items[target]] = [items[target], items[index]];
    setData({ ...data, items });
  }
  async function save() {
    setSaving(true); setMessage("");
    const res = await fetch("/api/admin/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json().catch(() => null);
    if (res.ok) { setData(json.gallery); setMessage("Galeria salva."); playUISound("save"); if (!adminMode) setEditing(false); }
    else { setMessage(json?.error ?? "Erro ao salvar."); playUISound("error"); }
    setSaving(false);
  }

  if (editing && isAdmin) return <div className="space-y-4 rounded-2xl border border-white/10 bg-black/70 p-4">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-white/60">Título<input className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white" value={data.title} onChange={(e)=>setData({...data,title:e.target.value})}/></label><label className="text-xs text-white/60">Descrição<input className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white" value={data.lead} onChange={(e)=>setData({...data,lead:e.target.value})}/></label></div>
    {data.items.map((item,index)=><div key={item.id} className="rounded-xl border border-white/10 p-3"><div className="grid gap-2 sm:grid-cols-2"><input placeholder="Título" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm" value={item.title} onChange={(e)=>patchItem(index,{title:e.target.value})}/><input placeholder="URL direta da imagem" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm" value={item.imageUrl} onChange={(e)=>patchItem(index,{imageUrl:e.target.value})}/><input placeholder="Descrição" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm" value={item.description ?? ""} onChange={(e)=>patchItem(index,{description:e.target.value})}/><input placeholder="Link ao clicar (opcional)" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm" value={item.linkUrl ?? ""} onChange={(e)=>patchItem(index,{linkUrl:e.target.value})}/><input placeholder="Texto alternativo" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm" value={item.alt ?? ""} onChange={(e)=>patchItem(index,{alt:e.target.value})}/><label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={Boolean(item.private)} onChange={(e)=>patchItem(index,{private:e.target.checked})}/> Privada</label></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>move(index,-1)} className="rounded-full border border-white/15 px-3 py-1 text-xs">↑</button><button onClick={()=>move(index,1)} className="rounded-full border border-white/15 px-3 py-1 text-xs">↓</button><button onClick={()=>setData({...data,items:data.items.filter((_,i)=>i!==index)})} className="rounded-full border border-red-400/30 px-3 py-1 text-xs text-red-300">Excluir</button></div></div>)}
    <div className="flex flex-wrap gap-2"><button onClick={addItem} className="rounded-full border border-white/15 px-4 py-2 text-sm">Adicionar por URL</button><button onClick={save} disabled={saving} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">{saving?"Salvando…":"Salvar"}</button>{!adminMode&&<button onClick={()=>setEditing(false)} className="rounded-full border border-white/15 px-4 py-2 text-sm">Cancelar</button>}</div>{message&&<p className="text-sm text-white/60">{message}</p>}
  </div>;

  const visible = data.items.filter((item)=>isAdmin || !item.private);
  return <div>{isAdmin&&<button onClick={()=>setEditing(true)} className="mb-5 rounded-full border border-white/15 px-4 py-2 text-sm">Editar galeria</button>}<div className="columns-1 gap-4 sm:columns-2 lg:columns-3">{visible.map((item)=><article key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-black/55"><a href={item.linkUrl || item.imageUrl} target="_blank" rel="noreferrer"><img src={item.imageUrl} alt={item.alt || item.title} loading="lazy" className="h-auto w-full object-cover"/></a><div className="p-4"><div className="flex items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{item.private&&<span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/50">Privada</span>}</div>{item.description&&<p className="mt-1 text-sm text-white/60">{item.description}</p>}</div></article>)}</div>{visible.length===0&&<p className="rounded-xl border border-white/10 bg-black/50 p-6 text-sm text-white/50">Nenhuma imagem adicionada ainda.</p>}</div>;
}
