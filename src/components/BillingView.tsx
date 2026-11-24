"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { billing } from "@/lib/actions";
import { Button, SectionTitle } from "./ui";

export function CreditMeter() {
  const b = useStore((s) => s.billing);
  if (!b?.enabled || b.error) return null;
  const pct = b.granted ? Math.round((b.remaining / b.granted) * 100) : 0;
  const low = b.remaining < 5;
  return (
    <div className="mb-3 rounded-lg border border-line bg-white p-2.5">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-semibold uppercase tracking-wider text-muted">Credits</span>
        <span className={`tabular font-semibold ${low ? "text-rose-600" : ""}`}>{b.remaining} / {b.granted}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full ${low ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-muted">Metered by Flexprice{low ? " · enrichment paused" : ""}</div>
    </div>
  );
}

export default function BillingView() {
  const { billing: b, leads, drafts } = useStore();
  const [busy, setBusy] = useState(false);
  if (!b) return <p className="text-muted">Loading billing…</p>;
  if (!b.enabled) return <p className="text-muted">Billing is not configured (FLEXPRICE_API_KEY not set).</p>;
  const card = "rounded-xl border border-line bg-white p-5";
  const h = "mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted";
  const usd = (credits: number) => `$${(credits * b.usdPerCredit).toFixed(2)}`;
  const perLead = leads
    .map((l) => {
      const sent = drafts.filter((d) => d.leadId === l.id && d.status === "sent").length;
      const credits = (l.enriched ? b.meters.lead_enriched?.credits ?? 0 : 0) + sent * (b.meters.outreach_sent?.credits ?? 0);
      return { l, sent, credits };
    })
    .filter((r) => r.credits > 0)
    .sort((a, c) => c.credits - a.credits);

  return (
    <div className="max-w-5xl">
      <SectionTitle kicker="Usage-based billing · Flexprice" title="Credits & metering" sub="Every enrichment, sent message and graph query is sent to Flexprice as a usage event. The workspace wallet holds prepaid credits; enrichment is blocked server-side when the balance can't cover it." />
      {b.error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{b.error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className={card}>
          <div className={h}>Wallet balance</div>
          <div className="font-serif text-5xl tabular">{b.remaining}</div>
          <div className="text-sm text-muted">of {b.granted} credits granted · {usd(b.remaining)} value</div>
          <div className="mt-4 flex gap-2">
            <Button disabled={busy} onClick={async () => { setBusy(true); await billing("topup", { credits: 50 }); setBusy(false); }}>+50 credits</Button>
            <Button variant="ghost" disabled={busy} onClick={async () => { setBusy(true); await billing("status"); setBusy(false); }}>Refresh</Button>
          </div>
          <p className="mt-2 text-[11px] text-muted">Top-up calls the Flexprice wallet top-up API (demo grant, no payment).</p>
        </div>
        <div className={`${card} md:col-span-2`}>
          <div className={h}>Meters (live from Flexprice)</div>
          <table className="w-full text-sm tabular">
            <thead><tr className="text-left text-[11px] uppercase text-muted"><th className="py-1">Meter · event</th><th>Unit price</th><th>Usage</th><th>Credits</th><th>Cost</th></tr></thead>
            <tbody>
              {Object.entries(b.meters).map(([k, m]) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-2">{m.name} <span className="font-mono text-[11px] text-muted">{k}</span></td>
                  <td>{m.credits} cr</td>
                  <td>{b.used[k] ?? 0}</td>
                  <td>{(b.used[k] ?? 0) * m.credits}</td>
                  <td>{usd((b.used[k] ?? 0) * m.credits)}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-semibold"><td className="py-2">Total consumed</td><td /><td /><td>{b.consumed}</td><td>{usd(b.consumed)}</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">Flexprice aggregates usage asynchronously; counts can trail by a few seconds.</p>
        </div>
      </div>

      <h2 className="mt-10 mb-3 font-serif text-2xl">Cost allocation per lead</h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm tabular">
          <thead className="bg-stone-50 text-left text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-2">Account</th><th>Enriched</th><th>Messages sent</th><th>Credits</th><th>Cost</th><th>Stage</th></tr></thead>
          <tbody>
            {perLead.length ? perLead.map(({ l, sent, credits }) => (
              <tr key={l.id} className="border-t border-line"><td className="px-4 py-2 font-medium">{l.company}</td><td>{l.enriched ? "yes" : "—"}</td><td>{sent}</td><td>{credits}</td><td>{usd(credits)}</td><td>{l.stage}</td></tr>
            )) : <tr><td colSpan={6} className="px-4 py-3 text-muted">No billable activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
