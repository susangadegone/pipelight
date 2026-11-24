"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import Intake from "@/components/Intake";
import IcpView from "@/components/IcpView";
import Leads from "@/components/Leads";
import GraphView from "@/components/GraphView";
import Review from "@/components/Review";
import Pipeline from "@/components/Pipeline";
import Analytics from "@/components/Analytics";
import Why from "@/components/Why";
import BillingView, { CreditMeter } from "@/components/BillingView";
import { billing } from "@/lib/actions";

const TABS = ["Intake", "ICP", "Leads", "Graph", "Review", "Pipeline", "Analytics", "Billing", "Why Pipelight"] as const;
type Tab = (typeof TABS)[number];

const AGENT_COLOR: Record<string, string> = { Billing: "text-amber-600", Planner: "text-accent", Builder: "text-ai", Reviewer: "text-rep", System: "text-rose-600" };

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("Intake");
  const [showThinking, setShowThinking] = useState(true);
  const s = useStore();
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
    billing("status");
  }, []);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [s.thinking.length]);
  if (!mounted) return null;

  const pending = s.drafts.filter((d) => d.status === "pending").length;
  const badge: Partial<Record<Tab, number | string>> = {
    Leads: s.leads.length || undefined,
    Review: pending || undefined,
    Pipeline: s.leads.filter((l) => l.stage !== "Matched").length || undefined,
  };
  const enabled = (t: Tab) => t === "Intake" || t === "Why Pipelight" || t === "Billing" || (t === "ICP" ? !!s.icp : s.leads.length > 0);

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-white/60 px-4 py-6">
        <div className="mb-8">
          <div className="font-serif text-3xl leading-none">Pipelight</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted">AI GTM Engine</div>
        </div>
        <nav className="space-y-0.5">
          {TABS.map((t, i) => (
            <button
              key={t}
              disabled={!enabled(t)}
              onClick={() => setTab(t)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm disabled:opacity-30 ${tab === t ? "bg-ink text-white" : "hover:bg-stone-100"}`}
            >
              <span><span className="mr-2 font-mono text-[11px] opacity-50">{i + 1}</span>{t}</span>
              {badge[t] !== undefined && <span className={`rounded-full px-1.5 text-[10px] tabular ${tab === t ? "bg-white/20" : t === "Review" ? "bg-amber-100 text-amber-800" : "bg-stone-200"}`}>{badge[t]}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto" />
        <CreditMeter />
        <div className="space-y-2 text-xs text-muted">
          <button className="hover:text-ink" onClick={() => setShowThinking(!showThinking)}>{showThinking ? "Hide" : "Show"} agent thinking</button>
          <br />
          <button className="hover:text-rose-600" onClick={() => confirm("Clear all data and start over?") && (s.reset(), setTab("Intake"))}>Reset workspace</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        {s.busy && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-accent ring-1 ring-blue-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> {s.busy}
          </div>
        )}
        {tab === "Intake" && <Intake onDone={() => setTab("ICP")} />}
        {tab === "ICP" && <IcpView onDone={() => setTab("Leads")} />}
        {tab === "Leads" && <Leads />}
        {tab === "Graph" && <GraphView />}
        {tab === "Review" && <Review />}
        {tab === "Pipeline" && <Pipeline />}
        {tab === "Analytics" && <Analytics />}
        {tab === "Why Pipelight" && <Why />}
        {tab === "Billing" && <BillingView />}
      </main>

      {showThinking && (
        <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Agent thinking</div>
            <div className="text-xs text-muted">Planner → Builder → Reviewer, live</div>
          </div>
          <div ref={feedRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed">
            {!s.thinking.length && <p className="text-muted">Idle. Start with product intake.</p>}
            {s.thinking.map((t) => (
              <div key={t.id}>
                <span className="text-muted">{new Date(t.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} </span>
                <span className={`font-semibold ${AGENT_COLOR[t.agent] ?? "text-ink"}`}>{t.agent}</span> {t.text}
              </div>
            ))}
            {s.busy && <div className="animate-pulse text-accent">▍</div>}
          </div>
        </aside>
      )}
    </div>
  );
}
