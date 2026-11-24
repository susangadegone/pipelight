"use client";
import { useStore } from "@/lib/store";
import { STAGES } from "@/lib/types";
import { ActorTag, SectionTitle } from "./ui";

const REACHED = (s: string, target: string) => STAGES.indexOf(s as never) >= STAGES.indexOf(target as never) && !(s === "Closed Lost" && target === "Closed Won");

function pct(n: number, d: number) {
  return d ? `${Math.round((n / d) * 100)}%` : "—";
}

export default function Analytics() {
  const { leads, drafts, audit } = useStore();
  const funnel = ["Matched", "Contacted", "Replied", "Meeting Booked", "Closed Won"].map((s) => ({ stage: s, n: leads.filter((l) => REACHED(l.stage, s)).length }));
  const max = Math.max(1, funnel[0].n);
  const segment = (key: (l: (typeof leads)[number]) => string) => {
    const m = new Map<string, { total: number; contacted: number; replied: number }>();
    leads.forEach((l) => {
      const k = key(l);
      const r = m.get(k) ?? { total: 0, contacted: 0, replied: 0 };
      r.total++;
      if (REACHED(l.stage, "Contacted")) r.contacted++;
      if (REACHED(l.stage, "Replied")) r.replied++;
      m.set(k, r);
    });
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  };
  const variants = (["A", "B"] as const).map((v) => {
    const sent = drafts.filter((d) => d.channel === "email" && d.variant === v && d.status === "sent");
    const replied = sent.filter((d) => REACHED(leads.find((l) => l.id === d.leadId)?.stage ?? "", "Replied"));
    return { v, sent: sent.length, replied: replied.length, angles: [...new Set(sent.map((d) => d.angle))].slice(0, 3) };
  });
  const aiActs = audit.filter((a) => a.actor === "ai").length;
  const repActs = audit.filter((a) => a.actor === "rep").length;
  const card = "rounded-xl border border-line bg-white p-5";
  const h = "mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted";
  const Table = ({ rows, label }: { rows: ReturnType<typeof segment>; label: string }) => (
    <table className="w-full text-sm tabular">
      <thead><tr className="text-left text-[11px] uppercase text-muted"><th className="py-1">{label}</th><th>Leads</th><th>Contact rate</th><th>Reply rate</th></tr></thead>
      <tbody>{rows.map(([k, r]) => <tr key={k} className="border-t border-line"><td className="py-1.5">{k}</td><td>{r.total}</td><td>{pct(r.contacted, r.total)}</td><td>{pct(r.replied, r.contacted)}</td></tr>)}</tbody>
    </table>
  );
  return (
    <div>
      <SectionTitle kicker="Analytics & attribution" title="What's converting" sub="Stage conversion by segment, A/B variant performance, and a full audit trail separating AI actions from rep actions." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <div className={h}>Funnel</div>
          {funnel.map((f, i) => (
            <div key={f.stage} className="mb-2">
              <div className="flex justify-between text-xs"><span>{f.stage}</span><span className="tabular">{f.n}{i > 0 && <span className="text-muted"> · {pct(f.n, funnel[i - 1].n)}</span>}</span></div>
              <div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-accent" style={{ width: `${(f.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={h}>Email A/B test</div>
          {variants.map((v) => (
            <div key={v.v} className="mb-3 border-b border-line pb-3 last:border-0">
              <div className="flex justify-between text-sm"><span className="font-mono">Variant {v.v}</span><span className="tabular">{v.replied}/{v.sent} replied · {pct(v.replied, v.sent)}</span></div>
              <div className="text-xs text-muted">{v.angles.join(" · ") || "not sent yet"}</div>
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={h}>Attribution</div>
          <div className="flex items-end gap-6">
            <div><div className="font-serif text-4xl tabular text-ai">{aiActs}</div><div className="text-xs text-muted">AI actions</div></div>
            <div><div className="font-serif text-4xl tabular text-rep">{repActs}</div><div className="text-xs text-muted">Rep actions</div></div>
          </div>
          <p className="mt-3 text-xs text-muted">Every dispatch requires a rep approval. AI handles research, scoring, drafting and stage updates on system events.</p>
        </div>
        <div className={`${card} lg:col-span-2`}>
          <div className={h}>By industry</div>
          <Table rows={segment((l) => l.industry)} label="Industry" />
        </div>
        <div className={card}>
          <div className={h}>By tier & size</div>
          <Table rows={segment((l) => `Tier ${l.tier} · ${l.sizeTier}`)} label="Segment" />
        </div>
      </div>
      <h2 className="mt-10 mb-3 font-serif text-2xl">Audit log</h2>
      <div className="max-h-96 overflow-auto rounded-xl border border-line bg-white">
        <table className="w-full text-xs">
          <tbody>
            {audit.map((a) => (
              <tr key={a.id} className="border-b border-line">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-muted">{new Date(a.ts).toLocaleTimeString()}</td>
                <td className="px-2"><ActorTag actor={a.actor} /></td>
                <td className="whitespace-nowrap px-2 font-medium">{a.action}</td>
                <td className="px-3 text-muted">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
