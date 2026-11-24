"use client";
import { useStore, uid } from "./store";
import { post } from "@/components/ui";
import type { Competitor, Draft, ICP, Lead, Person } from "./types";
import type { Billing } from "./store";

export async function billing(action: "status" | "meter" | "topup", extra: Record<string, unknown> = {}) {
  try {
    const b = await post<Billing>("/api/billing", { ws: S().workspaceId, action, ...extra });
    if (b.enabled === false) return S().setBilling({ enabled: false } as Billing);
    S().setBilling({ ...b, enabled: true });
    return b;
  } catch (e) {
    S().think("System", `Billing: ${(e as Error).message}`);
  }
}

const S = () => useStore.getState();

async function step<T>(busy: string, fn: () => Promise<T>): Promise<T | null> {
  S().setBusy(busy);
  try {
    return await fn();
  } catch (e) {
    S().think("System", `⚠ ${(e as Error).message}`);
    alert((e as Error).message);
    return null;
  } finally {
    S().setBusy(null);
  }
}

export async function generateIcp() {
  const { intake, think, setIcp, log } = S();
  think("Planner", "Parsing product intake: features, existing customers, pricing");
  const res = await step("Inferring ICP…", () => post<{ icp: ICP }>("/api/icp", intake));
  if (!res) return false;
  setIcp(res.icp);
  think("Planner", `ICP inferred: ${res.icp.industries.length} industries, ${res.icp.personas.length} personas, ${res.icp.triggers.length} triggers, ${res.icp.expansions.length} expansion segments`);
  log("ai", "ICP generated", res.icp.summary);
  return true;
}

export async function runDiscovery() {
  const { icp, intake, think, setDiscovery, log } = S();
  if (!icp) return false;
  const accepted = icp.expansions.filter((e) => e.status === "accepted").map((e) => e.segment);
  const icpForSearch = accepted.length
    ? { ...icp, searchQueries: [...icp.searchQueries.slice(0, 4), ...accepted.slice(0, 1).map((s) => `${s} companies expanding 2026`)] }
    : icp;
  think("Planner", `Dispatching discovery against approved ICP${accepted.length ? ` + ${accepted.length} accepted expansion(s)` : ""}`);
  const res = await step("Searching the web & extracting cited leads… (~1 min)", () =>
    post<{ leads: Lead[]; competitors: Competitor[]; steps: string[] }>("/api/discover", { icp: icpForSearch, product: intake.product }),
  );
  if (!res) return false;
  res.steps.forEach((s) => think(s.split(":")[0].length < 12 ? s.split(":")[0] : "Discovery", s.includes(":") && s.split(":")[0].length < 12 ? s.split(":").slice(1).join(":").trim() : s));
  setDiscovery(res.leads, res.competitors);
  for (const l of res.leads) log("ai", "Lead matched", `${l.company} (Tier ${l.tier}, ${l.fitScore}) · ${l.sources.length} source(s)`, l.id);
  return true;
}

export async function enrichLead(leadId: string) {
  const { leads, icp, think, setPeople, log } = S();
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return;
  if (!lead.domain) {
    think("Builder", `Skipped enrichment for ${lead.company}: no domain`);
    return;
  }
  think("Builder", `Enriching ${lead.domain} via Hunter.io domain search`);
  const keywords = (icp?.personas ?? []).flatMap((p) => p.title.toLowerCase().split(/[\s,/]+/)).filter((w) => w.length > 3);
  const res = await step(`Enriching ${lead.company}…`, () =>
    post<{ people: Person[]; company: { hq?: string } }>("/api/enrich", { domain: lead.domain, personaKeywords: keywords, ws: S().workspaceId }),
  );
  if (!res) {
    billing("status");
    return false;
  }
  // Merge: keep source-cited people from discovery, add Hunter contacts.
  const existing = lead.people.filter((p) => !res.people.some((h) => h.name.toLowerCase() === p.name.toLowerCase()));
  const people = [...res.people, ...existing];
  setPeople(leadId, people, res.company.hq ? { hq: res.company.hq } : undefined);
  const verified = res.people.filter((p) => p.emailStatus === "verified").length;
  think("Reviewer", `${lead.company}: ${res.people.length} contacts found, ${verified} verified emails`);
  log("ai", "Lead enriched", `${lead.company}: ${res.people.length} contacts, ${verified} verified`, leadId);
  think("Billing", `Metered lead_enriched → Flexprice (5 credits)`);
  billing("status");
  return true;
}

export async function draftOutreach(leadId: string, personId?: string) {
  const { leads, icp, intake, think, addDrafts, log } = S();
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return;
  const person = lead.people.find((p) => p.id === personId) ?? lead.people.find((p) => p.email) ?? lead.people[0];
  if (!person) {
    alert("No contact yet. Enrich this lead first.");
    return;
  }
  think("Builder", `Drafting A/B email + LinkedIn for ${person.name} (${person.title}) using ${lead.signals.length} signal(s)`);
  type R = { emailA: { angle: string; subject: string; body: string; signalsUsed: string[] }; emailB: R["emailA"]; linkedin: { angle: string; body: string; signalsUsed: string[] } };
  const res = await step(`Drafting outreach for ${lead.company}…`, () => post<R>("/api/draft", { lead, person, product: intake.product, icp }));
  if (!res) return;
  const base = { leadId, personId: person.id, status: "pending" as const, editedByRep: false, createdAt: Date.now() };
  const drafts: Draft[] = [
    { ...base, id: uid(), channel: "email", variant: "A", ...res.emailA },
    { ...base, id: uid(), channel: "email", variant: "B", ...res.emailB },
    { ...base, id: uid(), channel: "linkedin", variant: "A", ...res.linkedin },
  ];
  addDrafts(drafts);
  think("Reviewer", `3 drafts queued for human approval — nothing is sent without a rep`);
  log("ai", "Drafts queued", `${lead.company} → ${person.name}: email A (${res.emailA.angle}), email B (${res.emailB.angle}), LinkedIn`, leadId);
}

export function approveAndSend(draftId: string) {
  const { drafts, leads, updateDraft, log, moveLead, think } = S();
  const d = drafts.find((x) => x.id === draftId);
  if (!d) return;
  const lead = leads.find((l) => l.id === d.leadId);
  updateDraft(draftId, { status: "sent" });
  log("rep", "Draft approved", `${lead?.company}: ${d.channel} variant ${d.variant}${d.editedByRep ? " (edited)" : ""}`, d.leadId);
  log("ai", "Message dispatched (sandbox outbox)", `${d.channel === "email" ? d.subject : "LinkedIn note"} → ${lead?.company}`, d.leadId);
  think("Builder", `Dispatched ${d.channel} to sandbox outbox for ${lead?.company}`);
  // Reject sibling variant of the same channel so only one goes out per channel.
  drafts
    .filter((x) => x.leadId === d.leadId && x.channel === d.channel && x.id !== d.id && x.status === "pending")
    .forEach((x) => updateDraft(x.id, { status: "rejected" }));
  if (lead && lead.stage === "Matched") moveLead(lead.id, "Contacted", "ai", "first touch sent after rep approval");
  billing("meter", { event: "outreach_sent", properties: { channel: d.channel, variant: d.variant, lead: lead?.company ?? "" } }).then((b) => b && think("Billing", "Metered outreach_sent → Flexprice (1 credit)"));
}

export function rejectDraft(draftId: string) {
  const { drafts, leads, updateDraft, log } = S();
  const d = drafts.find((x) => x.id === draftId);
  if (!d) return;
  updateDraft(draftId, { status: "rejected" });
  log("rep", "Draft rejected", `${leads.find((l) => l.id === d.leadId)?.company}: ${d.channel} variant ${d.variant}`, d.leadId);
}
