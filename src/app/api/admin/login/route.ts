import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/auth";
import { isPasswordRegistered, registerPassword, verifyPassword } from "@/lib/credentials-store";

const MIN_PASSWORD_LENGTH = 8;

// Usado pela tela de login pra saber se deve mostrar "defina uma
// senha" (primeiro acesso) ou o formulário normal de login.
export async function GET() {
  try {
    const registered = await isPasswordRegistered();
    return NextResponse.json({ registered });
  } catch (err) {
    console.error("Erro checando data/admin-credentials.json:", err);
    return NextResponse.json({ error: "Erro no servidor." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let password: string;
    try {
      const body = await request.json();
      password = typeof body?.password === "string" ? body.password : "";
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Informe uma senha." }, { status: 400 });
    }

    const registered = await isPasswordRegistered();

    if (!registered) {
      // Primeiro acesso: o que for enviado aqui vira a senha do painel.
      // Depois desse ponto isso não roda de novo — só apagando
      // data/admin-credentials.json manualmente no servidor.
      if (password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` },
          { status: 400 }
        );
      }

      try {
        await registerPassword(password);
      } catch (err) {
        if (err instanceof Error && err.message === "ALREADY_REGISTERED") {
          // Corrida rara: duas requisições de registro ao mesmo tempo.
          // Quem chegou primeiro venceu.
          return NextResponse.json(
            { error: "A senha já foi registrada por outra requisição. Recarregue a página e entre normalmente." },
            { status: 409 }
          );
        }
        // Erro de verdade (ex.: pasta "data/" sem permissão de escrita
        // no servidor) — não é corrida, precisa aparecer como tal.
        console.error("Erro registrando senha do painel:", err);
        return NextResponse.json(
          { error: "Não deu pra salvar a senha no servidor. Veja os logs do servidor para mais detalhes." },
          { status: 500 }
        );
      }
    } else {
      const valid = await verifyPassword(password);
      if (!valid) {
        return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
      }
    }

    const token = await createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h, mesmo TTL do token
    });
    return response;
  } catch (err) {
    // Rede de segurança: garante que a resposta SEMPRE é JSON (senão o
    // front-end cai no erro genérico "Não foi possível entrar" mesmo
    // quando a causa real é outra, ex.: ADMIN_SESSION_SECRET ausente).
    console.error("Erro inesperado em /api/admin/login:", err);
    const message =
      err instanceof Error && err.message.includes("ADMIN_SESSION_SECRET")
        ? "ADMIN_SESSION_SECRET não configurado no servidor — veja .env.example."
        : "Erro no servidor. Veja os logs do servidor para mais detalhes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
