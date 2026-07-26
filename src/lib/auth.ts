/**
 * Sessão de login bem simples, sem banco de dados: um cookie contendo
 * "<expiraEm>.<assinatura HMAC>". A assinatura garante que o valor não
 * foi forjado (só quem tem ADMIN_SESSION_SECRET consegue gerar uma
 * assinatura válida) — não guardamos nada no servidor.
 *
 * Usa Web Crypto (`crypto.subtle`) em vez do módulo `crypto` do Node
 * de propósito: o middleware do Next.js roda no runtime Edge, que não
 * tem o módulo `crypto` do Node, mas tem Web Crypto — assim o mesmo
 * código funciona no middleware (Edge) e nas rotas de API (Node).
 *
 * Suficiente pra um painel de admin pessoal de baixo tráfego. Se um dia
 * precisar de múltiplos usuários/permissões, vale migrar pra algo tipo
 * NextAuth + banco.
 */

export const ADMIN_SESSION_COOKIE = "nyx_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Compara duas strings de mesmo formato em tempo aproximadamente
// constante — evita vazar informação por diferença de tempo de
// resposta. (Web Crypto não expõe um timingSafeEqual pronto.)
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET não configurado — defina em .env.local (veja .env.example)."
    );
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(value: string): Promise<string> {
  const key = await getKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(sigBuf);
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload);
  if (!constantTimeEqual(signature, expected)) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}

// A senha do painel não vem mais de variável de ambiente: ela é
// registrada uma única vez (primeiro acesso) e guardada com hash em
// data/admin-credentials.json — veja src/lib/credentials-store.ts.
