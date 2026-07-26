"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContactContent, RowItem } from "@/content/types";
import { playUISound } from "@/lib/site-sounds";

type Props = {
  mode?: "all" | "socials";
  compact?: boolean;
};

type EditorData = {
  contact: ContactContent;
  socialMedia: {
    heading: string;
    items: RowItem[];
  };
};

type SaveState = "idle" | "saving" | "saved" | "error";

const emptyContact: ContactContent = {
  lead: "",
  email: "",
  emailCtaLabel: "Enviar e-mail",
  otherContacts: [],
};

export function ContactSocialEditor({ mode = "all", compact = false }: Props) {
  const router = useRouter();
  const [data, setData] = useState<EditorData>({
    contact: emptyContact,
    socialMedia: { heading: "Outras redes", items: [] },
  });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(!compact);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/content")
      .then(async (res) => {
        if (!res.ok) throw new Error("Não consegui carregar os dados.");
        return res.json();
      })
      .then((payload) => {
        setData({
          contact: payload.contact ?? emptyContact,
          socialMedia: payload.socialMedia ?? { heading: "Outras redes", items: [] },
        });
      })
      .catch((error: Error) => {
        setSaveState("error");
        setMessage(error.message);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateSocial(index: number, key: keyof RowItem, value: string) {
    setData((current) => ({
      ...current,
      socialMedia: {
        ...current.socialMedia,
        items: current.socialMedia.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
    setSaveState("idle");
  }

  function addSocial() {
    playUISound("press");
    setData((current) => ({
      ...current,
      socialMedia: {
        ...current.socialMedia,
        items: [...current.socialMedia.items, { title: "Nova rede", href: "https://" }],
      },
    }));
  }

  function removeSocial(index: number) {
    playUISound("press");
    setData((current) => ({
      ...current,
      socialMedia: {
        ...current.socialMedia,
        items: current.socialMedia.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function moveSocial(index: number, direction: -1 | 1) {
    setData((current) => {
      const next = [...current.socialMedia.items];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination], next[index]];
      return { ...current, socialMedia: { ...current.socialMedia, items: next } };
    });
  }

  function updateContact(key: keyof Omit<ContactContent, "otherContacts">, value: string) {
    setData((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
    setSaveState("idle");
  }

  function updateOtherContact(index: number, key: keyof RowItem, value: string) {
    setData((current) => ({
      ...current,
      contact: {
        ...current.contact,
        otherContacts: current.contact.otherContacts.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  }

  async function save() {
    setSaveState("saving");
    setMessage("");
    try {
      const body = mode === "socials" ? { socialMedia: data.socialMedia } : data;
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Não consegui salvar.");
      setSaveState("saved");
      setMessage("Alterações salvas.");
      playUISound("save");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Não consegui salvar.");
      playUISound("error");
    }
  }

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white hover:bg-white hover:text-black"
      >
        Editar mídias sociais
      </button>
    );
  }

  return (
    <div className={compact ? "mb-8 rounded-2xl border border-white/15 bg-black/75 p-4 backdrop-blur" : "space-y-8"}>
      {compact && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Mídias sociais</p>
            <p className="text-xs text-white/50">Visível somente para o administrador.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/60 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {loading ? <p className="text-sm text-white/50">Carregando…</p> : (
        <>
          {mode === "all" && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Informações de contato</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-xs text-white/60">Texto de introdução
                  <textarea value={data.contact.lead} onChange={(e) => updateContact("lead", e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
                </label>
                <label className="text-xs text-white/60">E-mail
                  <input type="email" value={data.contact.email} onChange={(e) => updateContact("email", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
                </label>
                <label className="text-xs text-white/60">Texto do botão
                  <input value={data.contact.emailCtaLabel} onChange={(e) => updateContact("emailCtaLabel", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-white/70">Outros contatos</span><button type="button" onClick={() => setData((c) => ({ ...c, contact: { ...c.contact, otherContacts: [...c.contact.otherContacts, { title: "Novo contato", href: "https://" }] } }))} className="rounded-full border border-white/15 px-3 py-1 text-xs">Adicionar</button></div>
                {data.contact.otherContacts.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_2fr_auto]">
                    <input value={item.title} onChange={(e) => updateOtherContact(index, "title", e.target.value)} placeholder="Nome" className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm" />
                    <input value={item.href ?? ""} onChange={(e) => updateOtherContact(index, "href", e.target.value)} placeholder="https://" className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm" />
                    <button type="button" onClick={() => setData((c) => ({ ...c, contact: { ...c.contact, otherContacts: c.contact.otherContacts.filter((_, i) => i !== index) } }))} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300">Excluir</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Mídias sociais da Home</h3>
                <p className="text-xs text-white/50">Adicione qualquer rede ou link externo e organize a ordem.</p>
              </div>
              <button type="button" onClick={addSocial} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white hover:text-black">Adicionar rede</button>
            </div>
            <label className="mb-3 block text-xs text-white/60">Título do grupo
              <input value={data.socialMedia.heading} onChange={(e) => setData((c) => ({ ...c, socialMedia: { ...c.socialMedia, heading: e.target.value } }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm" />
            </label>
            <div className="space-y-2">
              {data.socialMedia.items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-black/40 p-3 sm:grid-cols-[1fr_2fr_auto]">
                  <input value={item.title} onChange={(e) => updateSocial(index, "title", e.target.value)} placeholder="Nome da rede" className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm" />
                  <input value={item.href ?? ""} onChange={(e) => updateSocial(index, "href", e.target.value)} placeholder="https://" className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm" />
                  <div className="flex gap-1">
                    <button type="button" disabled={index === 0} onClick={() => moveSocial(index, -1)} className="rounded-lg border border-white/10 px-2 text-xs disabled:opacity-25">↑</button>
                    <button type="button" disabled={index === data.socialMedia.items.length - 1} onClick={() => moveSocial(index, 1)} className="rounded-lg border border-white/10 px-2 text-xs disabled:opacity-25">↓</button>
                    <button type="button" onClick={() => removeSocial(index)} className="rounded-lg border border-red-400/20 px-2 text-xs text-red-300">×</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={saveState === "saving"} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">
              {saveState === "saving" ? "Salvando…" : "Salvar alterações"}
            </button>
            {message && <span className={`text-xs ${saveState === "error" ? "text-red-400" : "text-emerald-300"}`}>{message}</span>}
          </div>
        </>
      )}
    </div>
  );
}
