"use client";

import { useEffect, useState } from "react";
import { cdnUrl } from "@/lib/cdn";

interface RanksForm {
  deadlock: {
    steamAccountId: string;
    steamId64: string;
    steamId3: string;
    steamProfileName: string | null;
    steamAvatarUrl: string | null;
    steamProfileUrl: string | null;
    manualRankName: string;
    manualRankImageSrc: string | null;
  };
  overwatch: {
    battleTag: string;
    role: "tank" | "damage" | "support";
    manualRankName: string;
    manualRankImageSrc: string | null;
  };
}

interface IntegrationsForm {
  twitchChannelLogin: string;
  lastfmUsername: string;
  ranks: RanksForm;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const EMPTY_FORM: IntegrationsForm = {
  twitchChannelLogin: "",
  lastfmUsername: "",
  ranks: {
    deadlock: {
      steamAccountId: "",
      steamId64: "",
      steamId3: "",
      steamProfileName: null,
      steamAvatarUrl: null,
      steamProfileUrl: null,
      manualRankName: "",
      manualRankImageSrc: null,
    },
    overwatch: { battleTag: "", role: "damage", manualRankName: "", manualRankImageSrc: null },
  },
};

export function IntegrationsEditor() {
  const [form, setForm] = useState<IntegrationsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [disconnectingSteam, setDisconnectingSteam] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((res) => res.json())
      .then((data) => {
        const integrations = data.integrations ?? {};
        setForm({
          twitchChannelLogin: integrations.twitchChannelLogin ?? "",
          lastfmUsername: integrations.lastfmUsername ?? "",
          ranks: {
            deadlock: {
              steamAccountId: integrations.ranks?.deadlock?.steamAccountId ?? "",
              steamId64: integrations.ranks?.deadlock?.steamId64 ?? "",
              steamId3: integrations.ranks?.deadlock?.steamId3 ?? "",
              steamProfileName: integrations.ranks?.deadlock?.steamProfileName ?? null,
              steamAvatarUrl: integrations.ranks?.deadlock?.steamAvatarUrl ?? null,
              steamProfileUrl: integrations.ranks?.deadlock?.steamProfileUrl ?? null,
              manualRankName: integrations.ranks?.deadlock?.manualRankName ?? "",
              manualRankImageSrc: integrations.ranks?.deadlock?.manualRankImageSrc ?? null,
            },
            overwatch: {
              battleTag: integrations.ranks?.overwatch?.battleTag ?? "",
              role: integrations.ranks?.overwatch?.role ?? "damage",
              manualRankName: integrations.ranks?.overwatch?.manualRankName ?? "",
              manualRankImageSrc: integrations.ranks?.overwatch?.manualRankImageSrc ?? null,
            },
          },
        });
      })
      .catch(() => setError("Não consegui carregar as integrações atuais."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrations: form }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setError("Não consegui salvar. Tenta de novo.");
    }
  }

  async function handleSteamDisconnect() {
    setDisconnectingSteam(true);
    setError(null);
    try {
      const response = await fetch("/api/steam/disconnect", { method: "POST" });
      if (!response.ok) throw new Error();
      setForm((previous) => ({
        ...previous,
        ranks: {
          ...previous.ranks,
          deadlock: {
            ...previous.ranks.deadlock,
            steamAccountId: "",
            steamId64: "",
            steamId3: "",
            steamProfileName: null,
            steamAvatarUrl: null,
            steamProfileUrl: null,
          },
        },
      }));
    } catch {
      setError("Não consegui desconectar a conta Steam.");
    } finally {
      setDisconnectingSteam(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-6 text-sm text-white/50">
        Carregando…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-4 sm:p-5">
      <p className="mb-4 text-xs text-white/50">
        Identificadores publicos usados pelos widgets da Home — nenhuma chave/senha fica aqui.
      </p>

      <div className="flex flex-col gap-4">
        <Field label="Login da Twitch" hint="O mesmo que aparece em twitch.tv/<login>, tudo minúsculo.">
          <input
            type="text"
            value={form.twitchChannelLogin}
            onChange={(e) => setForm((prev) => ({ ...prev, twitchChannelLogin: e.target.value }))}
            placeholder="nyx_aim"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
          />
        </Field>

        <Field
          label="Usuário do Last.fm"
          hint="O Last.fm precisa estar conectado ao Spotify/YT Music com scrobbling ativado."
        >
          <input
            type="text"
            value={form.lastfmUsername}
            onChange={(e) => setForm((prev) => ({ ...prev, lastfmUsername: e.target.value }))}
            placeholder="seu_usuario_lastfm"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
          />
        </Field>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-white/60">
            Rank — Deadlock
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] p-3">
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${form.ranks.deadlock.steamId64 ? "text-emerald-400" : "text-white"}`}>
                  {form.ranks.deadlock.steamId64 ? "Conectado" : "Conta Steam não conectada"}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {form.ranks.deadlock.steamId3 || "Use o OpenID para obter o SteamID com segurança."}
                </p>
              </div>
              {form.ranks.deadlock.steamId64 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={form.ranks.deadlock.steamProfileUrl || "#"}
                    target={form.ranks.deadlock.steamProfileUrl ? "_blank" : undefined}
                    rel={form.ranks.deadlock.steamProfileUrl ? "noreferrer" : undefined}
                    className="flex items-center gap-2 rounded-full pr-2 text-sm font-bold text-white transition hover:bg-white/5"
                  >
                    {form.ranks.deadlock.steamAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.ranks.deadlock.steamAvatarUrl}
                        alt=""
                        className="h-12 w-12 rounded-full border-2 border-emerald-400/70 object-cover"
                      />
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-emerald-400/70 bg-[#1b2838] text-lg text-[#66c0f4]">
                        S
                      </span>
                    )}
                    <span>{form.ranks.deadlock.steamProfileName || "Steam"}</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleSteamDisconnect}
                    disabled={disconnectingSteam}
                    className="rounded-lg border border-red-400/35 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300 transition hover:border-red-300 hover:text-white disabled:cursor-wait disabled:opacity-50"
                  >
                    {disconnectingSteam ? "Saindo…" : "Sair"}
                  </button>
                </div>
              ) : (
                <a
                  href="/api/steam/connect"
                  aria-label="Conectar conta Steam"
                  className="inline-flex rounded transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66c0f4]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cdnUrl("/steam/sign-in-through-steam.png")}
                    alt="Sign in through Steam"
                    width={180}
                    height={35}
                  />
                </a>
              )}
            </div>
            <Field label="Steam Account ID" hint="Preenchido automaticamente pelo Steam OpenID e usado pela Deadlock API.">
              <input
                type="text"
                value={form.ranks.deadlock.steamAccountId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ranks: {
                      ...prev.ranks,
                      deadlock: { ...prev.ranks.deadlock, steamAccountId: e.target.value },
                    },
                  }))
                }
                placeholder="1307778067"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              />
            </Field>
            <Field label="Fallback manual (se a API não responder)">
              <input
                type="text"
                value={form.ranks.deadlock.manualRankName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ranks: {
                      ...prev.ranks,
                      deadlock: { ...prev.ranks.deadlock, manualRankName: e.target.value },
                    },
                  }))
                }
                placeholder="—"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-white/60">
            Rank — Overwatch
          </div>
          <div className="flex flex-col gap-3">
            <Field label="BattleTag" hint="Exatamente como aparece no jogo, ex: Nyx#1234.">
              <input
                type="text"
                value={form.ranks.overwatch.battleTag}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ranks: {
                      ...prev.ranks,
                      overwatch: { ...prev.ranks.overwatch, battleTag: e.target.value },
                    },
                  }))
                }
                placeholder="Nyx#1234"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              />
            </Field>
            <Field label="Role exibida">
              <select
                value={form.ranks.overwatch.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ranks: {
                      ...prev.ranks,
                      overwatch: {
                        ...prev.ranks.overwatch,
                        role: e.target.value as "tank" | "damage" | "support",
                      },
                    },
                  }))
                }
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              >
                <option value="tank">Tank</option>
                <option value="damage">Damage</option>
                <option value="support">Support</option>
              </select>
            </Field>
            <Field label="Fallback manual (se a API não responder)">
              <input
                type="text"
                value={form.ranks.overwatch.manualRankName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ranks: {
                      ...prev.ranks,
                      overwatch: { ...prev.ranks.overwatch, manualRankName: e.target.value },
                    },
                  }))
                }
                placeholder="—"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:border-white/40"
              />
            </Field>
          </div>
        </div>
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/55">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/35">{hint}</span>}
    </label>
  );
}
