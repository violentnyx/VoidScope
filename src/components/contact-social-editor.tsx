"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContactContent, RowItem } from "@/content/types";
import { playUISound } from "@/lib/site-sounds";

type SaveState = "idle" | "saving" | "saved" | "error";

const emptyContact: ContactContent = {
  lead: "",
  email: "",
  emailCtaLabel: "Enviar e-mail",
  otherContacts: [],
};

function mergeLinks(...groups: RowItem[][]) {
  const seen = new Set<string>();
  return groups.flat().filter((item) => {
    const key = `${item.title.trim().toLowerCase()}|${item.href?.trim().toLowerCase() ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ContactSocialEditor() {
  const router = useRouter();
  const [contact, setContact] = useState<ContactContent>(emptyContact);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/content")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não consegui carregar os dados.");
        return response.json();
      })
      .then((payload) => {
        const savedContact = { ...emptyContact, ...payload.contact };
        setContact({
          ...savedContact,
          otherContacts: mergeLinks(
            savedContact.otherContacts ?? [],
            payload.socialMedia?.items ?? [],
          ),
        });
      })
      .catch((error: Error) => {
        setSaveState("error");
        setMessage(error.message);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateField(
    key: keyof Omit<ContactContent, "otherContacts">,
    value: string,
  ) {
    setContact((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
  }

  function updateLink(index: number, key: keyof RowItem, value: string) {
    setContact((current) => ({
      ...current,
      otherContacts: current.otherContacts.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    setSaveState("idle");
  }

  function addLink() {
    playUISound("press");
    setContact((current) => ({
      ...current,
      otherContacts: [
        ...current.otherContacts,
        { title: "Nova rede", href: "https://" },
      ],
    }));
  }

  function removeLink(index: number) {
    playUISound("press");
    setContact((current) => ({
      ...current,
      otherContacts: current.otherContacts.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  function moveLink(index: number, direction: -1 | 1) {
    setContact((current) => {
      const next = [...current.otherContacts];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination], next[index]];
      return { ...current, otherContacts: next };
    });
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          // Mantido sincronizado para migrar instalações que ainda possuam
          // o formato antigo em `socialMedia`.
          socialMedia: {
            heading: "Contatos",
            items: contact.otherContacts,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Não consegui salvar.");
      }
      setSaveState("saved");
      setMessage("Informações de contato salvas.");
      playUISound("save");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (error) {
      setSaveState("error");
      setMessage(
        error instanceof Error ? error.message : "Não consegui salvar.",
      );
      playUISound("error");
    }
  }

  if (loading) {
    return <p className="text-sm text-white/50">Carregando…</p>;
  }

  return (
    <div className="space-y-6 bg-black/60 p-4 sm:p-5">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-white">
          Meu bloco de contato
        </h3>
        <p className="mb-4 text-xs text-white/50">
          E-mail, portfólio e redes sociais são administrados juntos. Os links
          aparecem sob a foto do perfil e também na página Contact Me.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-white/60 sm:col-span-2">
            Texto de introdução
            <textarea
              value={contact.lead}
              onChange={(event) => updateField("lead", event.target.value)}
              rows={3}
              className="mt-1 w-full border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/35"
            />
          </label>
          <label className="text-xs text-white/60">
            E-mail
            <input
              type="email"
              value={contact.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="mt-1 w-full border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/35"
            />
          </label>
          <label className="text-xs text-white/60">
            Texto do botão de e-mail
            <input
              value={contact.emailCtaLabel}
              onChange={(event) =>
                updateField("emailCtaLabel", event.target.value)
              }
              className="mt-1 w-full border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/35"
            />
          </label>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Links e redes sociais
            </h3>
            <p className="text-xs text-white/50">
              O nome identifica automaticamente o ícone da rede.
            </p>
          </div>
          <button
            type="button"
            onClick={addLink}
            className="bg-white px-3 py-1.5 text-xs font-semibold text-black hover:opacity-85"
          >
            Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {contact.otherContacts.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="grid gap-2 bg-white/[.035] p-3 sm:grid-cols-[1fr_2fr_auto]"
            >
              <input
                value={item.title}
                onChange={(event) =>
                  updateLink(index, "title", event.target.value)
                }
                placeholder="Instagram, LinkedIn, Portfólio…"
                className="border border-white/10 bg-black/60 px-3 py-2 text-sm"
              />
              <input
                value={item.href ?? ""}
                onChange={(event) =>
                  updateLink(index, "href", event.target.value)
                }
                placeholder="https://"
                className="border border-white/10 bg-black/60 px-3 py-2 text-sm"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveLink(index, -1)}
                  className="border border-white/10 px-2 text-xs disabled:opacity-25"
                  aria-label={`Mover ${item.title} para cima`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === contact.otherContacts.length - 1}
                  onClick={() => moveLink(index, 1)}
                  className="border border-white/10 px-2 text-xs disabled:opacity-25"
                  aria-label={`Mover ${item.title} para baixo`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="border border-red-400/20 px-2 text-xs text-red-300"
                  aria-label={`Excluir ${item.title}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {saveState === "saving" ? "Salvando…" : "Salvar contatos"}
        </button>
        {message && (
          <span
            className={`text-xs ${
              saveState === "error" ? "text-red-400" : "text-emerald-300"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
