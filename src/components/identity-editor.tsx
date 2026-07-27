"use client";

import { useEffect, useState } from "react";

interface IdentityForm {
  name: string;
  tag: string;
  bio: string;
  avatarSrc: string | null;
  avatarShape: "square" | "rounded" | "circle";
  avatarBackgroundOpacity: number;
  avatarFrameEnabled: boolean;
  avatarFrameColor: string;
  avatarFrameWidth: number;
  socialLinksPosition: "below-avatar" | "below-bio";
}

interface BrandForm {
  logoSrc: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function IdentityEditor() {
  const [identity, setIdentity] = useState<IdentityForm>({
    name: "",
    tag: "",
    bio: "",
    avatarSrc: null,
    avatarShape: "square",
    avatarBackgroundOpacity: 60,
    avatarFrameEnabled: false,
    avatarFrameColor: "#ffffff",
    avatarFrameWidth: 2,
    socialLinksPosition: "below-avatar",
  });
  const [brand, setBrand] = useState<BrandForm>({ logoSrc: null });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((res) => res.json())
      .then((data) => {
        setIdentity({
          name: data.identity?.name ?? "",
          tag: data.identity?.tag ?? "",
          bio: data.identity?.bio ?? "",
          avatarSrc: data.identity?.avatarSrc ?? null,
          avatarShape: data.identity?.avatarShape ?? "square",
          avatarBackgroundOpacity: data.identity?.avatarBackgroundOpacity ?? 60,
          avatarFrameEnabled: data.identity?.avatarFrameEnabled ?? false,
          avatarFrameColor: data.identity?.avatarFrameColor ?? "#ffffff",
          avatarFrameWidth: data.identity?.avatarFrameWidth ?? 2,
          socialLinksPosition: data.identity?.socialLinksPosition ?? "below-avatar",
        });
        setBrand({ logoSrc: data.brand?.logoSrc ?? null });
      })
      .catch(() => setError("Não consegui carregar o conteúdo atual."))
      .finally(() => setLoading(false));
  }, []);

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Falha no upload.");
    return data.url as string;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      setIdentity((prev) => ({ ...prev, avatarSrc: url }));
    } catch {
      setError("Não consegui enviar a foto. Tenta outro arquivo (PNG/JPG/WEBP/GIF, até 5MB).");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const url = await uploadFile(file);
      setBrand((prev) => ({ ...prev, logoSrc: url }));
    } catch {
      setError("Não consegui enviar a logo. Tenta outro arquivo (PNG/JPG/WEBP/GIF, até 5MB).");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, brand }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setError("Não consegui salvar. Tenta de novo.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-6 text-sm text-white/50">
        Carregando…
      </div>
    );
  }

  const avatarShapeClass = {
    square: "rounded-none",
    rounded: "rounded-xl",
    circle: "rounded-full",
  }[identity.avatarShape];

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-4 sm:p-5">
      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`h-20 w-20 shrink-0 overflow-hidden ${avatarShapeClass}`}
            style={{
              backgroundColor: `rgb(0 0 0 / ${identity.avatarBackgroundOpacity / 100})`,
              border: identity.avatarFrameEnabled
                ? `${identity.avatarFrameWidth}px solid ${identity.avatarFrameColor}`
                : "none",
            }}
          >
            {identity.avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={identity.avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                avatar
              </div>
            )}
          </div>
          <label className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white hover:text-black">
            {uploadingAvatar ? "Enviando…" : "Trocar foto"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={uploadingAvatar}
            />
          </label>
          <p className="max-w-40 text-center text-[10px] leading-relaxed text-white/40">
            GIFs são convertidos automaticamente para WebP animado.
          </p>
        </div>

        {/* Text fields */}
        <div className="flex flex-col gap-3">
          <Field label="Nome">
            <input
              type="text"
              value={identity.name}
              onChange={(e) => setIdentity((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
            />
          </Field>

          <Field label="Tag">
            <input
              type="text"
              value={identity.tag}
              onChange={(e) => setIdentity((prev) => ({ ...prev, tag: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
            />
          </Field>

          <Field label="Bio">
            <textarea
              value={identity.bio}
              onChange={(e) => setIdentity((prev) => ({ ...prev, bio: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
            />
          </Field>

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <Field label="Formato da foto">
              <select
                value={identity.avatarShape}
                onChange={(e) =>
                  setIdentity((prev) => ({
                    ...prev,
                    avatarShape: e.target.value as IdentityForm["avatarShape"],
                  }))
                }
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              >
                <option value="square">Quadrado</option>
                <option value="rounded">Cantos suaves</option>
                <option value="circle">Circular</option>
              </select>
            </Field>

            <Field label="Posição dos ícones sociais">
              <select
                value={identity.socialLinksPosition}
                onChange={(e) =>
                  setIdentity((prev) => ({
                    ...prev,
                    socialLinksPosition:
                      e.target.value as IdentityForm["socialLinksPosition"],
                  }))
                }
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              >
                <option value="below-avatar">Abaixo da foto</option>
                <option value="below-bio">Abaixo da bio</option>
              </select>
            </Field>
          </div>

          <Field label={`Opacidade do fundo da foto: ${identity.avatarBackgroundOpacity}%`}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={identity.avatarBackgroundOpacity}
              onChange={(e) =>
                setIdentity((prev) => ({
                  ...prev,
                  avatarBackgroundOpacity: Number(e.target.value),
                }))
              }
              className="w-full accent-white"
            />
          </Field>

          <div className="border border-white/10 bg-white/[.025] p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
              <input
                type="checkbox"
                checked={identity.avatarFrameEnabled}
                onChange={(e) =>
                  setIdentity((prev) => ({
                    ...prev,
                    avatarFrameEnabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-white"
              />
              Usar moldura na foto
            </label>

            {identity.avatarFrameEnabled ? (
              <div className="mt-3 grid grid-cols-[1fr_110px] gap-3">
                <Field label={`Espessura: ${identity.avatarFrameWidth}px`}>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={identity.avatarFrameWidth}
                    onChange={(e) =>
                      setIdentity((prev) => ({
                        ...prev,
                        avatarFrameWidth: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-white"
                  />
                </Field>
                <Field label="Cor">
                  <input
                    type="color"
                    value={identity.avatarFrameColor}
                    onChange={(e) =>
                      setIdentity((prev) => ({
                        ...prev,
                        avatarFrameColor: e.target.value,
                      }))
                    }
                    className="h-9 w-full cursor-pointer border border-white/15 bg-black/40 p-1"
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black/40">
          {brand.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoSrc} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] text-white/40">logo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Logo (navbar)</div>
          <div className="text-xs text-white/50">Vazio usa o ícone padrão.</div>
        </div>
        <label className="shrink-0 cursor-pointer rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white hover:text-black">
          {uploadingLogo ? "Enviando…" : "Trocar logo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleLogoChange}
            className="hidden"
            disabled={uploadingLogo}
          />
        </label>
        {brand.logoSrc && (
          <button
            type="button"
            onClick={() => setBrand({ logoSrc: null })}
            className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/50 hover:bg-white hover:text-black"
          >
            Remover
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {saveState === "saving" ? "Salvando…" : "Salvar"}
        </button>
        {saveState === "saved" && (
          <span className="text-xs text-emerald-300">Salvo — já vale pro site.</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/55">{label}</span>
      {children}
    </label>
  );
}
