export const CRM_STAGES = ["novo", "contato", "qualificado", "simulacao", "negociacao", "convertido", "perdido"] as const;
export type CrmStage = (typeof CRM_STAGES)[number];

export interface CrmLead {
  id: string;
  name: string;
  instagram: string;
  phone: string;
  email: string;
  interest: string;
  creditValue: number;
  source: string;
  sourceContent: string;
  stage: CrmStage;
  nextAction: string;
  nextActionAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivity {
  id: string;
  leadId: string;
  type: "direct" | "whatsapp" | "ligacao" | "reuniao" | "simulacao" | "nota";
  description: string;
  occurredAt: string;
  createdAt: string;
}

export interface CrmData { leads: CrmLead[]; activities: CrmActivity[]; }
