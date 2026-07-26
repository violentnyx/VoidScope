import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  bearerToken,
  hashWeddingPassword,
  isWeddingAdmin,
  readWeddingDatabase,
  verifyWeddingPassword,
  WEDDING_SESSION_TTL_MS,
  writeWeddingDatabase,
  type WeddingDatabase,
  type WeddingLink,
} from "@/lib/wedding-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path?: string[] }> };

function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function error(message: string, status: number): NextResponse {
  return json({ error: message }, status);
}

async function body(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function text(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function links(value: unknown): WeddingLink[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((entry) => {
    const item =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : {};
    const link: WeddingLink = {
      loja: text(item.loja, 100),
      modelo: text(item.modelo, 200),
      url: text(item.url, 2000),
    };
    const refLabel = text(item.refLabel, 200);
    const refUrl = text(item.refUrl, 2000);
    if (refLabel) link.refLabel = refLabel;
    if (refUrl) link.refUrl = refUrl;
    return link;
  });
}

function adminDatabase(request: NextRequest): WeddingDatabase | null {
  const database = readWeddingDatabase();
  return isWeddingAdmin(request, database) ? database : null;
}

async function routePath(context: RouteContext): Promise<string[]> {
  return (await context.params).path ?? [];
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const segments = await routePath(context);
    const database = readWeddingDatabase();
    if (segments[0] === "setup-status" && segments.length === 1) {
      return json({ needsSetup: !database.adminPasswordHash });
    }
    if (segments[0] === "config" && segments.length === 1) {
      return json(database.config);
    }
    if (segments[0] === "items" && segments.length === 1) {
      return json(database.items);
    }
    return error("Rota não encontrada.", 404);
  } catch (cause) {
    console.error("[wedding/get]", cause);
    return error("Não foi possível ler os dados da wishlist.", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const segments = await routePath(context);
    const payload = await body(request);

    if (segments[0] === "setup" && segments.length === 1) {
      const database = readWeddingDatabase();
      if (database.adminPasswordHash) {
        return error("Uma senha de admin já foi configurada.", 400);
      }
      const password = text(payload.senha, 200);
      if (password.length < 8) {
        return error("A senha precisa ter ao menos 8 caracteres.", 400);
      }
      database.adminPasswordHash = hashWeddingPassword(password);
      database.sessions = [];
      writeWeddingDatabase(database);
      return json({ ok: true });
    }

    if (segments[0] === "login" && segments.length === 1) {
      const database = readWeddingDatabase();
      if (!database.adminPasswordHash) {
        return error("Nenhuma senha configurada ainda.", 400);
      }
      if (
        !verifyWeddingPassword(
          text(payload.senha, 200),
          database.adminPasswordHash
        )
      ) {
        return error("Senha incorreta.", 401);
      }
      const token = randomBytes(32).toString("hex");
      database.sessions = (database.sessions ?? []).filter(
        (session) => Date.now() - session.created < WEDDING_SESSION_TTL_MS
      );
      database.sessions.push({ token, created: Date.now() });
      writeWeddingDatabase(database);
      return json({ token });
    }

    if (segments[0] === "logout" && segments.length === 1) {
      const database = adminDatabase(request);
      if (!database) return error("Não autenticado.", 401);
      const token = bearerToken(request);
      database.sessions = (database.sessions ?? []).filter(
        (session) => session.token !== token
      );
      writeWeddingDatabase(database);
      return json({ ok: true });
    }

    if (segments[0] === "change-password" && segments.length === 1) {
      const database = adminDatabase(request);
      if (!database) return error("Não autenticado.", 401);
      if (
        !verifyWeddingPassword(
          text(payload.senhaAtual, 200),
          database.adminPasswordHash
        )
      ) {
        return error("Senha atual incorreta.", 401);
      }
      const newPassword = text(payload.novaSenha, 200);
      if (newPassword.length < 8) {
        return error("A nova senha precisa ter ao menos 8 caracteres.", 400);
      }
      database.adminPasswordHash = hashWeddingPassword(newPassword);
      database.sessions = [];
      writeWeddingDatabase(database);
      return json({ ok: true });
    }

    if (segments[0] === "items" && segments.length === 1) {
      const database = adminDatabase(request);
      if (!database) return error("Não autenticado.", 401);
      const categoria = text(payload.categoria, 120);
      const nome = text(payload.nome, 200);
      if (!categoria || !nome) {
        return error("Categoria e nome são obrigatórios.", 400);
      }
      const item = {
        id: randomUUID(),
        categoria,
        nome,
        descricao: text(payload.descricao, 2000),
        precoEstimado: text(payload.precoEstimado, 100),
        imagemUrl: text(payload.imagemUrl, 2000),
        links: links(payload.links),
        reservadoPor: null,
        reservadoEm: null,
      };
      database.items.push(item);
      writeWeddingDatabase(database);
      return json(item, 201);
    }

    if (
      segments[0] === "items" &&
      segments[1] &&
      segments[2] === "reserve" &&
      segments.length === 3
    ) {
      const database = readWeddingDatabase();
      const item = database.items.find((entry) => entry.id === segments[1]);
      if (!item) return error("Item não encontrado.", 404);
      if (item.reservadoPor) {
        return error("Este item já foi reservado por outra pessoa.", 409);
      }
      const nome = text(payload.nome, 160);
      if (!nome) return error("Informe seu nome para reservar.", 400);
      item.reservadoPor = nome;
      item.reservadoEm = new Date().toISOString();
      writeWeddingDatabase(database);
      return json(item);
    }

    if (
      segments[0] === "items" &&
      segments[1] &&
      segments[2] === "unreserve" &&
      segments.length === 3
    ) {
      const database = readWeddingDatabase();
      const item = database.items.find((entry) => entry.id === segments[1]);
      if (!item) return error("Item não encontrado.", 404);
      if (!isWeddingAdmin(request, database)) {
        const nome = text(payload.nome, 160).toLocaleLowerCase("pt-BR");
        if (
          !item.reservadoPor ||
          nome !== item.reservadoPor.trim().toLocaleLowerCase("pt-BR")
        ) {
          return error(
            "Digite o mesmo nome usado na reserva para poder cancelá-la.",
            403
          );
        }
      }
      item.reservadoPor = null;
      item.reservadoEm = null;
      writeWeddingDatabase(database);
      return json(item);
    }

    return error("Rota não encontrada.", 404);
  } catch (cause) {
    console.error("[wedding/post]", cause);
    return error("Não foi possível atualizar a wishlist.", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const segments = await routePath(context);
    const database = adminDatabase(request);
    if (!database) return error("Não autenticado.", 401);
    const payload = await body(request);

    if (segments[0] === "config" && segments.length === 1) {
      const allowed = [
        "eyebrow",
        "heroLine1",
        "heroItalic",
        "heroLine3",
        "lede",
        "footer",
        "eventDate",
        "eventLabel",
        "categorias",
      ];
      for (const key of allowed) {
        if (!(key in payload)) continue;
        if (key === "categorias") {
          database.config.categorias = Array.isArray(payload.categorias)
            ? payload.categorias
                .map((category) => text(category, 120))
                .filter(Boolean)
                .slice(0, 30)
            : database.config.categorias;
        } else if (key === "eventDate") {
          database.config.eventDate = payload.eventDate
            ? text(payload.eventDate, 100)
            : null;
        } else {
          database.config[key] = text(payload[key], 4000);
        }
      }
      writeWeddingDatabase(database);
      return json(database.config);
    }

    if (segments[0] === "items" && segments[1] && segments.length === 2) {
      const item = database.items.find((entry) => entry.id === segments[1]);
      if (!item) return error("Item não encontrado.", 404);
      if ("categoria" in payload) item.categoria = text(payload.categoria, 120);
      if ("nome" in payload) item.nome = text(payload.nome, 200);
      if ("descricao" in payload)
        item.descricao = text(payload.descricao, 2000);
      if ("precoEstimado" in payload)
        item.precoEstimado = text(payload.precoEstimado, 100);
      if ("imagemUrl" in payload)
        item.imagemUrl = text(payload.imagemUrl, 2000);
      if ("links" in payload) item.links = links(payload.links);
      if (!item.categoria || !item.nome) {
        return error("Categoria e nome são obrigatórios.", 400);
      }
      writeWeddingDatabase(database);
      return json(item);
    }

    return error("Rota não encontrada.", 404);
  } catch (cause) {
    console.error("[wedding/put]", cause);
    return error("Não foi possível atualizar a wishlist.", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const segments = await routePath(context);
    const database = adminDatabase(request);
    if (!database) return error("Não autenticado.", 401);
    if (segments[0] === "items" && segments[1] && segments.length === 2) {
      const before = database.items.length;
      database.items = database.items.filter(
        (entry) => entry.id !== segments[1]
      );
      if (database.items.length === before) {
        return error("Item não encontrado.", 404);
      }
      writeWeddingDatabase(database);
      return json({ ok: true });
    }
    return error("Rota não encontrada.", 404);
  } catch (cause) {
    console.error("[wedding/delete]", cause);
    return error("Não foi possível excluir o item.", 500);
  }
}
