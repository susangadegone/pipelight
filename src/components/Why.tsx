"use client";
import { SectionTitle } from "./ui";

const ALTS = [
  ["Apollo / ZoomInfo", "Contact data, no reasoning", "You still define the ICP, write the copy, and judge fit yourself."],
  ["Clay", "Powerful enrichment workflows", "Needs a GTM-ops person to build and maintain tables; no approval-gated outreach."],
  ["ChatGPT + spreadsheets", "Good copy, no grounding", "No live sources, invents companies and signals, and loses context between tabs."],
  ["Autonomous AI SDRs (11x, AiSDR)", "Fully automated sending", "No human gate: one bad message at scale burns the domain and the brand."],
];

const PLANS = [
  ["Starter", "$149/mo", "200 enriched leads, 1 seat, email outreach"],
  ["Growth", "$499/mo", "1,000 enriched leads, 3 seats, A/B analytics, LinkedIn drafts"],
  ["Usage overage", "$0.40 / enriched lead", "Metered per lead enriched and message sent"],
];

export default function Why() {
  const card = "rounded-xl border border-line bg-white p-5";
  const h = "mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted";
  return (
    <div className="max-w-5xl">
      <SectionTitle kicker="Why Pipelight" title="One context from ICP to closed deal" sub="Seed to Series A B2B teams without a RevOps function: founder-led sales and first sales hires who need pipeline before they can afford a GTM stack." />
      <div className="grid gap-4 md:grid-cols-3">
        <div className={card}>
          <div className={h}>The pain</div>
          <p className="text-sm">GTM runs across 5+ disconnected tools: an ICP in a slide deck, searches in a browser, contacts in Apollo, copy in ChatGPT, tracking in a spreadsheet. Every handoff drops context, so targeting drifts and messages go generic.</p>
        </div>
        <div className={card}>
          <div className={h}>The wedge</div>
          <p className="text-sm">Every lead is <b>cited</b> (no source, no lead), every message is <b>grounded in a real signal</b>, and every send is <b>approved by a human</b>. That trust is what lets a founder use AI on their own brand.</p>
        </div>
        <div className={card}>
          <div className={h}>Why now</div>
          <p className="text-sm">LLMs with structured outputs can reason over live web evidence reliably enough to do research an SDR used to do by hand, as long as a deterministic guard checks the citations.</p>
        </div>
      </div>

      <h2 className="mt-10 mb-3 font-serif text-2xl">How it compares</h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-[11px] uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-2">Alternative</th><th className="px-4 py-2">Strength</th><th className="px-4 py-2">Gap Pipelight closes</th></tr>
          </thead>
          <tbody>
            {ALTS.map(([a, s, g]) => (
              <tr key={a} className="border-t border-line"><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-muted">{s}</td><td className="px-4 py-2.5">{g}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className={card}>
          <div className={h}>Business model (usage-based)</div>
          {PLANS.map(([n, p, d]) => (
            <div key={n} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0">
              <span className="font-medium">{n}</span>
              <span className="text-xs text-muted">{d}</span>
              <span className="font-serif text-xl tabular whitespace-nowrap">{p}</span>
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={h}>Unit economics (estimated from prototype runs)</div>
          <ul className="space-y-1.5 text-sm">
            <li>Discovery: ~1 LLM call + 7 searches per batch of ~12 cited leads</li>
            <li>Enrichment: 1 Hunter domain search per account</li>
            <li>Outreach: 1 LLM call → 3 drafts per contact</li>
            <li className="pt-1 font-medium">≈ $0.10–0.25 cost per fully worked lead vs. $0.40 price → healthy gross margin, improving with caching and batching</li>
          </ul>
          <p className="mt-2 text-xs text-muted">Estimates, not measured billing. Vendor prices vary by plan.</p>
        </div>
      </div>
    </div>
  );
}
