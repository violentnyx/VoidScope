import { NextRequest, NextResponse } from "next/server";
import { getCrmData, isCrmStage, saveCrmData } from "@/lib/crm-store";
import type { CrmActivity, CrmLead } from "@/lib/crm-types";

const text = (value: unknown) => String(value ?? "").trim();

export async function GET() { return NextResponse.json(await getCrmData()); }

export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = await getCrmData();
  const now = new Date().toISOString();
  if (body.kind === "activity") {
    if (!data.leads.some((lead) => lead.id === body.leadId)) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    const activity: CrmActivity = { id: crypto.randomUUID(), leadId: text(body.leadId), type: body.type ?? "nota", description: text(body.description), occurredAt: text(body.occurredAt) || now, createdAt: now };
    if (!activity.description) return NextResponse.json({ error: "Descreva a atividade." }, { status: 400 });
    data.activities.unshift(activity);
    await saveCrmData(data);
    return NextResponse.json(activity, { status: 201 });
  }
  const name = text(body.name);
  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  const lead: CrmLead = { id: crypto.randomUUID(), name, instagram: text(body.instagram), phone: text(body.phone), email: text(body.email), interest: text(body.interest), creditValue: Math.max(0, Number(body.creditValue) || 0), source: text(body.source) || "Instagram", sourceContent: text(body.sourceContent), stage: isCrmStage(body.stage) ? body.stage : "novo", nextAction: text(body.nextAction), nextActionAt: text(body.nextActionAt), notes: text(body.notes), createdAt: now, updatedAt: now };
  data.leads.unshift(lead);
  await saveCrmData(data);
  return NextResponse.json(lead, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const data = await getCrmData();
  const index = data.leads.findIndex((lead) => lead.id === body.id);
  if (index < 0) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  const current = data.leads[index];
  const lead: CrmLead = { ...current, name: text(body.name ?? current.name), instagram: text(body.instagram ?? current.instagram), phone: text(body.phone ?? current.phone), email: text(body.email ?? current.email), interest: text(body.interest ?? current.interest), creditValue: Math.max(0, Number(body.creditValue ?? current.creditValue) || 0), source: text(body.source ?? current.source), sourceContent: text(body.sourceContent ?? current.sourceContent), stage: isCrmStage(body.stage) ? body.stage : current.stage, nextAction: text(body.nextAction ?? current.nextAction), nextActionAt: text(body.nextActionAt ?? current.nextActionAt), notes: text(body.notes ?? current.notes), updatedAt: new Date().toISOString() };
  if (!lead.name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  data.leads[index] = lead;
  await saveCrmData(data);
  return NextResponse.json(lead);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const data = await getCrmData();
  data.leads = data.leads.filter((lead) => lead.id !== id);
  data.activities = data.activities.filter((activity) => activity.leadId !== id);
  await saveCrmData(data);
  return NextResponse.json({ ok: true });
}
