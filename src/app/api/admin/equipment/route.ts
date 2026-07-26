import { NextRequest, NextResponse } from "next/server";
import { getEquipmentData, saveEquipmentData } from "@/lib/equipment-store";
import type { ListPageContent } from "@/content/types";

export async function GET() {
  return NextResponse.json(await getEquipmentData());
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as ListPageContent;
  if (!body || typeof body.lead !== "string" || !Array.isArray(body.sections)) {
    return NextResponse.json({ error: "Conteúdo inválido." }, { status: 400 });
  }
  return NextResponse.json(await saveEquipmentData(body));
}
