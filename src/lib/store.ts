"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Actor, AuditEvent, Competitor, Draft, ICP, Lead, Person, Stage, ThinkingStep } from "./types";

export type Intake = { product: string; customers: string; pricing: string };

type State = {
  intake: Intake;
  icp: ICP | null;
  leads: Lead[];
  competitors: Competitor[];
  drafts: Draft[];
  audit: AuditEvent[];
  thinking: ThinkingStep[];
  busy: string | null;
  setIntake: (i: Partial<Intake>) => void;
  setIcp: (icp: ICP | null) => void;
  setExpansion: (id: string, status: "accepted" | "dismissed" | "suggested") => void;
  setDiscovery: (leads: Lead[], competitors: Competitor[]) => void;
  setPeople: (leadId: string, people: Person[], patch?: Partial<Lead>) => void;
  addDrafts: (d: Draft[]) => void;
  updateDraft: (id: string, patch: Partial<Draft>) => void;
  moveLead: (leadId: string, stage: Stage, actor: Actor, why?: string) => void;
  log: (actor: Actor, action: string, detail: string, leadId?: string) => void;
  think: (agent: string, text: string) => void;
  setBusy: (b: string | null) => void;
  reset: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const empty = { intake: { product: "", customers: "", pricing: "" }, icp: null, leads: [], competitors: [], drafts: [], audit: [], thinking: [], busy: null };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,
      setIntake: (i) => set({ intake: { ...get().intake, ...i } }),
      setIcp: (icp) => set({ icp }),
      setExpansion: (id, status) => {
        const icp = get().icp;
        if (!icp) return;
        const exp = icp.expansions.find((e) => e.id === id);
        set({ icp: { ...icp, expansions: icp.expansions.map((e) => (e.id === id ? { ...e, status } : e)) } });
        if (exp) get().log("rep", `Expansion ${status}`, exp.segment);
      },
      setDiscovery: (leads, competitors) => set({ leads, competitors, drafts: [] }),
      setPeople: (leadId, people, patch) =>
        set({ leads: get().leads.map((l) => (l.id === leadId ? { ...l, ...patch, people, enriched: true } : l)) }),
      addDrafts: (d) => set({ drafts: [...d, ...get().drafts] }),
      updateDraft: (id, patch) => set({ drafts: get().drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }),
      moveLead: (leadId, stage, actor, why) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead || lead.stage === stage) return;
        set({ leads: get().leads.map((l) => (l.id === leadId ? { ...l, stage } : l)) });
        get().log(actor, `Stage → ${stage}`, `${lead.company}: ${lead.stage} → ${stage}${why ? ` (${why})` : ""}`, leadId);
      },
      log: (actor, action, detail, leadId) =>
        set({ audit: [{ id: uid(), ts: Date.now(), actor, action, detail, leadId }, ...get().audit].slice(0, 500) }),
      think: (agent, text) => set({ thinking: [...get().thinking, { id: uid(), ts: Date.now(), agent, text }].slice(-200) }),
      setBusy: (busy) => set({ busy }),
      reset: () => set({ ...empty }),
    }),
    { name: "pipelight-v1", partialize: (s) => ({ ...s, busy: null }) },
  ),
);

export { uid };
