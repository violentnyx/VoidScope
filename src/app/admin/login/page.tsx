"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // null enquanto não sabemos se já existe senha registrada.
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/login")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: { registered: boolean }) => {
        if (!cancelled) setRegistered(Boolean(data.registered));
      })
      .catch(() => {
        if (!cancelled) setStatusError("Não deu pra verificar o estado do painel. Recarregue a página.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isFirstAccess = registered === false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isFirstAccess) {
      if (password.length < 8) {
        setError("A senha precisa ter pelo menos 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Não foi possível entrar.");
        setLoading(false);
        return;
      }

      const next = searchParams.get("next") || "/admin";
      router.push(next);
      router.refresh();
    } catch {
      setError("Erro de rede — tenta de novo.");
      setLoading(false);
    }
  }

  if (registered === null && !statusError) {
    return (
      <div className="mx-auto flex max-w-xs flex-col items-center pt-16 text-center">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-2 mb-8 text-sm text-white/60">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center pt-16 text-center">
      <h1 className="text-2xl font-bold">Admin</h1>

      {isFirstAccess ? (
        <p className="mt-2 mb-8 text-sm text-white/60">
          Primeiro acesso: defina a senha do painel. Depois disso ela não
          pode mais ser trocada por aqui — só apagando o registro no
          servidor.
        </p>
      ) : (
        <p className="mt-2 mb-8 text-sm text-white/60">Entre com a senha do painel.</p>
      )}

      {statusError ? (
        <p className="text-xs text-red-400">{statusError}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isFirstAccess ? "Nova senha" : "Senha"}
            autoFocus
            autoComplete={isFirstAccess ? "new-password" : "current-password"}
            className="rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus-visible:border-white/40"
          />

          {isFirstAccess && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a senha"
              autoComplete="new-password"
              className="rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus-visible:border-white/40"
            />
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={
              loading ||
              !password ||
              (isFirstAccess && (!confirmPassword || password.length < 8))
            }
            className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {loading ? "Enviando…" : isFirstAccess ? "Definir senha e entrar" : "Entrar"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
