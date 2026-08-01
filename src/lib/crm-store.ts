import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { CRM_STAGES, type CrmData, type CrmStage } from "@/lib/crm-types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "crm.json");

export async function getCrmData(): Promise<CrmData> {
  try {
    const parsed = JSON.parse(await readFile(FILE_PATH, "utf-8")) as Partial<CrmData>;
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    };
  } catch {
    return { leads: [], activities: [] };
  }
}

export async function saveCrmData(data: CrmData): Promise<CrmData> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

export function isCrmStage(value: unknown): value is CrmStage {
  return CRM_STAGES.includes(value as CrmStage);
}
