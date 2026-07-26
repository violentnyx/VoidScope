import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  description?: string;
  alt?: string;
  private?: boolean;
}

export interface GalleryData {
  title: string;
  lead: string;
  items: GalleryItem[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "gallery.json");

const defaults: GalleryData = {
  title: "Galeria",
  lead: "Imagens, artes e registros selecionados.",
  items: [],
};

export async function getGallery(): Promise<GalleryData> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<GalleryData>;
    return { ...defaults, ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return defaults;
  }
}

export async function saveGallery(data: GalleryData): Promise<GalleryData> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  return data;
}
