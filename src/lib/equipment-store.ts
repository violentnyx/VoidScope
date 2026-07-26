import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { siteContent } from "@/content/site-content";
import type { ListPageContent } from "@/content/types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "equipment.json");

export async function getEquipmentData(): Promise<ListPageContent> {
  try {
    return JSON.parse(await readFile(FILE_PATH, "utf-8")) as ListPageContent;
  } catch {
    return siteContent.equipment;
  }
}

export async function saveEquipmentData(data: ListPageContent): Promise<ListPageContent> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  return data;
}
