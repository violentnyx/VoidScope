import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Mesma ressalva do content-store.ts: isso grava no disco local, então
// só funciona em servidor com disco persistente (Lightsail, etc.), não
// em hospedagem serverless/edge.

// `data/` aponta para o volume persistente no Lightsail. Nunca grave uploads
// dentro de `public/`: cada deploy troca a release e apagaria esses arquivos.
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato não suportado. Use PNG, JPG, WEBP ou GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Arquivo maior que 5MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return NextResponse.json({ ok: true, url: `/api/uploads/${filename}` });
}
