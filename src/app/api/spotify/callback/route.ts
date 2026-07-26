import { NextRequest, NextResponse } from "next/server";
import {
  constantTimeStateEqual,
  exchangeSpotifyAuthorizationCode,
  SPOTIFY_OAUTH_STATE_COOKIE,
} from "@/lib/spotify-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character
  );
}

function resultPage(options: {
  title: string;
  message: string;
  refreshToken?: string;
}): string {
  const token = options.refreshToken ? escapeHtml(options.refreshToken) : "";
  const tokenBlock = options.refreshToken
    ? `
      <p>Copie o token abaixo agora. Ele aparece somente nesta conclusão do setup e não é salvo pelo site.</p>
      <label for="token">SPOTIFY_REFRESH_TOKEN</label>
      <textarea id="token" readonly spellcheck="false">${token}</textarea>
      <button id="copy" type="button">Copiar refresh token</button>
      <p class="note">Depois, adicione-o ao <code>.env.local</code> ou às variáveis de ambiente da AWS e reinicie a aplicação.</p>
      <script>
        const button = document.getElementById("copy");
        const token = document.getElementById("token");
        button.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(token.value);
            button.textContent = "Copiado!";
          } catch {
            token.select();
            document.execCommand("copy");
            button.textContent = "Copiado!";
          }
        });
      </script>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title>${escapeHtml(options.title)} — Spotify</title>
    <style>
      :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #080808; color: #f7f7f7; }
      main { width: min(680px, calc(100% - 40px)); padding: 32px; border: 1px solid #2b2b2b; border-radius: 18px; background: #111; box-sizing: border-box; }
      h1 { margin: 0 0 12px; font-size: 1.7rem; }
      p { color: #b8b8b8; line-height: 1.6; }
      label { display: block; margin: 24px 0 8px; font-size: .75rem; font-weight: 700; letter-spacing: .08em; color: #1ed760; }
      textarea { width: 100%; min-height: 130px; resize: vertical; box-sizing: border-box; padding: 14px; border: 1px solid #383838; border-radius: 10px; background: #060606; color: #fff; font: 13px ui-monospace, monospace; }
      button, a { display: inline-block; margin-top: 14px; padding: 11px 17px; border: 0; border-radius: 999px; background: #1ed760; color: #08130b; font-weight: 800; text-decoration: none; cursor: pointer; }
      .note { font-size: .875rem; }
      code { color: #fff; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(options.title)}</h1>
      <p>${escapeHtml(options.message)}</p>
      ${tokenBlock}
      <a href="/admin">Voltar ao painel</a>
    </main>
  </body>
</html>`;
}

function htmlResponse(body: string, status: number): NextResponse {
  const response = new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
  response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/api/spotify",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const parameters = request.nextUrl.searchParams;
  const state = parameters.get("state");
  const expectedState = request.cookies.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value;

  if (!constantTimeStateEqual(state, expectedState)) {
    return htmlResponse(
      resultPage({
        title: "Autorização inválida",
        message:
          "O state expirou ou não corresponde ao início deste fluxo. Volte ao painel e tente autorizar novamente.",
      }),
      400
    );
  }

  const spotifyError = parameters.get("error");
  if (spotifyError) {
    return htmlResponse(
      resultPage({
        title: "Autorização cancelada",
        message:
          spotifyError === "access_denied"
            ? "A permissão foi recusada na Spotify. Nenhum token foi gerado."
            : `A Spotify retornou o erro: ${spotifyError}.`,
      }),
      400
    );
  }

  const code = parameters.get("code");
  if (!code) {
    return htmlResponse(
      resultPage({
        title: "Código ausente",
        message: "A Spotify não enviou um authorization code válido.",
      }),
      400
    );
  }

  try {
    const tokens = await exchangeSpotifyAuthorizationCode(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "A Spotify não devolveu um refresh token. Inicie uma nova autorização pelo painel."
      );
    }

    return htmlResponse(
      resultPage({
        title: "Spotify conectado",
        message:
          "A autorização foi concluída. O access token temporário foi descartado e somente o refresh token abaixo precisa ser configurado.",
        refreshToken: tokens.refresh_token,
      }),
      200
    );
  } catch (error) {
    console.error("[spotify/callback]", error);
    return htmlResponse(
      resultPage({
        title: "Não foi possível gerar o token",
        message:
          error instanceof Error
            ? error.message
            : "A troca do authorization code falhou. Tente novamente pelo painel.",
      }),
      502
    );
  }
}
