"use client";
import { useStore } from "@/lib/store";
import { runDiscovery } from "@/lib/actions";
import { Button, Confidence, SectionTitle } from "./ui";

export default function IcpView({ onDone }: { onDone: () => void }) {
  const { icp, setExpansion, busy } = useStore();
  if (!icp) return <p className="text-muted">Complete the product intake first.</p>;
  const card = "rounded-xl border border-line bg-white p-5";
  const h = "mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
  return (
    <div className="max-w-5xl">
      <SectionTitle kicker="Step 2 · Ideal customer profile" title={icp.summary} sub="Every field carries a confidence score: how directly your intake supports the inference." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <div className={h}>Industries</div>
          {icp.industries.map((i) => (
            <div key={i.name} className="flex items-center justify-between border-b border-line py-1.5 text-sm last:border-0">
              <span>
                {i.name} <span className="font-mono text-[11px] text-muted">NAICS {i.naics}</span>
              </span>
              <Confidence value={i.confidence} />
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={h}>Company size</div>
          <div className="flex items-center justify-between text-sm">
            <span>{icp.companySize.headcount} · {icp.companySize.revenue}</span>
            <Confidence value={icp.companySize.confidence} />
          </div>
          <div className={`${h} mt-5`}>Geographies</div>
          <div className="text-sm">{icp.geographies.join(" · ")}</div>
          <div className={`${h} mt-5`}>Negative signals (auto-excluded)</div>
          <ul className="list-inside list-disc text-sm text-muted">{icp.negativeSignals.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
        <div className={card}>
          <div className={h}>Buyer personas</div>
          {icp.personas.map((p) => (
            <div key={p.title} className="border-b border-line py-2 last:border-0">
              <div className="flex items-center justify-between text-sm font-medium">
                {p.title} <span className="font-normal text-muted">· {p.seniority}</span>
                <span className="ml-auto"><Confidence value={p.confidence} /></span>
              </div>
              <div className="text-xs text-muted">{p.why}</div>
            </div>
          ))}
        </div>
        <div className={card}>
          <div className={h}>Trigger events</div>
          {icp.triggers.map((t) => (
            <div key={t.event} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
              <span>{t.event}</span>
              <Confidence value={t.confidence} />
            </div>
          ))}
        </div>
      </div>

      <h2 className="mt-10 font-serif text-2xl">Expansion segments</h2>
      <p className="mb-3 text-sm text-muted">Adjacent markets the engine thinks could buy. Accepted segments are added to discovery.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {icp.expansions.map((e) => (
          <div key={e.id} className={`${card} ${e.status === "dismissed" ? "opacity-40" : ""} ${e.status === "accepted" ? "border-emerald-300 ring-2 ring-emerald-100" : ""}`}>
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="text-sm font-semibold">{e.segment}</div>
              <Confidence value={e.confidence} />
            </div>
            <p className="mb-3 text-xs text-muted">{e.reasoning}</p>
            <div className="flex gap-2">
              {e.status === "suggested" ? (
                <>
                  <Button variant="ok" onClick={() => setExpansion(e.id, "accepted")}>Accept</Button>
                  <Button variant="ghost" onClick={() => setExpansion(e.id, "dismissed")}>Dismiss</Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setExpansion(e.id, "suggested")}>Undo ({e.status})</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Button disabled={!!busy} onClick={async () => (await runDiscovery()) && onDone()}>
          {busy ?? "Approve ICP & discover accounts →"}
        </Button>
        <span className="text-xs text-muted">Runs live web search; every lead must cite a source or it is dropped.</span>
      </div>
    </div>
  );
}
