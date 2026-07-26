import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

/**
 * Só pra Server Components (páginas). Diz se quem está pedindo a
 * página tem uma sessão de admin válida — usado pra deixar o admin ver
 * o conteúdo normal de uma página mesmo quando ela está em "Staging"
 * pra todo mundo. O middleware (src/proxy.ts) já faz essa checagem pra
 * /admin/** e /api/admin/**; isso aqui é a mesma checagem, disponível
 * pras páginas públicas também.
 */
export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidSessionToken(token);
}
