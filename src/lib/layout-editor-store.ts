import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { DEFAULT_LAYOUT_DOCUMENT, type LayoutDocument } from "@/lib/layout-editor-types";

interface StoredLayouts {
  draft: LayoutDocument;
  published?: LayoutDocument;
  updatedAt: string;
  publishedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LAYOUT_PATH = path.join(DATA_DIR, "layout-editor.json");

export async function getStoredLayouts(): Promise<StoredLayouts> {
  try {
    return JSON.parse(await readFile(LAYOUT_PATH, "utf-8")) as StoredLayouts;
  } catch {
    return { draft: DEFAULT_LAYOUT_DOCUMENT, updatedAt: new Date(0).toISOString() };
  }
}

export async function saveLayoutDraft(draft: LayoutDocument): Promise<StoredLayouts> {
  const next = { ...(await getStoredLayouts()), draft, updatedAt: new Date().toISOString() };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LAYOUT_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export async function publishLayout(draft: LayoutDocument): Promise<StoredLayouts> {
  const now = new Date().toISOString();
  const next = { draft, published: draft, updatedAt: now, publishedAt: now };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(LAYOUT_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
