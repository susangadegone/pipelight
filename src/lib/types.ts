// Shared domain types for Pipelight.

export type Scored<T> = { value: T; confidence: number };

export type Persona = { title: string; seniority: string; why: string; confidence: number };

export type Expansion = {
  id: string;
  segment: string;
  reasoning: string;
  confidence: number;
  status: "suggested" | "accepted" | "dismissed";
};

export type ICP = {
  summary: string;
  industries: { name: string; naics: string; confidence: number }[];
  companySize: { headcount: string; revenue: string; confidence: number };
  personas: Persona[];
  triggers: { event: string; confidence: number }[];
  negativeSignals: string[];
  geographies: string[];
  expansions: Expansion[];
  searchQueries: string[];
  competitorQueries: string[];
};

export type Source = { url: string; title: string };

export type Signal = { id: string; text: string; type: string; source: Source };

export type Person = {
  id: string;
  name: string;
  title: string;
  linkedin?: string;
  email?: string;
  emailStatus?: "verified" | "risky" | "unknown" | "not_found";
  emailConfidence?: number;
  previousCompanies?: string[];
  source?: Source;
};

export type Stage = "Matched" | "Contacted" | "Replied" | "Meeting Booked" | "Closed Won" | "Closed Lost";
export const STAGES: Stage[] = ["Matched", "Contacted", "Replied", "Meeting Booked", "Closed Won", "Closed Lost"];

export type Actor = "ai" | "rep";

export type Lead = {
  id: string;
  company: string;
  domain: string;
  industry: string;
  sizeTier: "SMB" | "Mid-Market" | "Enterprise";
  hq?: string;
  whyFit: string;
  fitScore: number; // 0-100
  tier: "A" | "B" | "C";
  signals: Signal[];
  people: Person[];
  sources: Source[];
  competitorsUsed: string[];
  stage: Stage;
  enriched: boolean;
  createdAt: number;
};

export type Competitor = {
  id: string;
  name: string;
  category: "direct" | "indirect" | "alternative";
  positioning: string;
  pricing: string;
  ourEdge: string;
  source: Source;
};

export type Draft = {
  id: string;
  leadId: string;
  personId: string;
  channel: "email" | "linkedin";
  variant: "A" | "B";
  angle: string;
  subject?: string;
  body: string;
  signalsUsed: string[];
  status: "pending" | "approved" | "rejected" | "sent";
  editedByRep: boolean;
  createdAt: number;
};

export type AuditEvent = {
  id: string;
  ts: number;
  actor: Actor;
  action: string;
  detail: string;
  leadId?: string;
};

export type ThinkingStep = { id: string; ts: number; agent: string; text: string };
