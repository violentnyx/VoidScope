import { NextRequest, NextResponse } from "next/server";
import {
  getStoredLayouts,
  publishLayout,
  saveLayoutDraft,
} from "@/lib/layout-editor-store";
import type { LayoutDocument, LayoutNode } from "@/lib/layout-editor-types";

const NODE_TYPES = new Set(["identity", "twitch", "video", "music", "ranks", "container"]);

function isLayoutNode(value: unknown): value is LayoutNode {
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  return typeof node.id === "string" && typeof node.type === "string" &&
    NODE_TYPES.has(node.type) && typeof node.label === "string" &&
    (node.width === "half" || node.width === "full") &&
    typeof node.visible === "boolean" && typeof node.locked === "boolean";
}

function isLayoutDocument(value: unknown): value is LayoutDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  if (doc.version !== 1 || (doc.navPosition !== "top" && doc.navPosition !== "left") || !Array.isArray(doc.pages)) return false;
  return doc.pages.length > 0 && doc.pages.every((valuePage) => {
    if (!valuePage || typeof valuePage !== "object") return false;
    const page = valuePage as Record<string, unknown>;
    return typeof page.id === "string" && typeof page.name === "string" &&
      typeof page.route === "string" && page.route.startsWith("/") &&
      Array.isArray(page.nodes) && page.nodes.every(isLayoutNode);
  });
}

export async function GET() {
  return NextResponse.json(await getStoredLayouts());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { action?: unknown; document?: unknown } | null;
  if (!body || !isLayoutDocument(body.document)) {
    return NextResponse.json({ error: "Documento de layout inválido." }, { status: 400 });
  }
  try {
    const saved = body.action === "publish"
      ? await publishLayout(body.document)
      : await saveLayoutDraft(body.document);
    return NextResponse.json({ ok: true, ...saved });
  } catch (error) {
    console.error("Erro salvando layout:", error);
    return NextResponse.json({ error: "Não foi possível salvar o layout." }, { status: 500 });
  }
}
