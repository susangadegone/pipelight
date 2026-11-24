"use client";
import { Fragment, useState } from "react";
import { useStore } from "@/lib/store";
import { draftOutreach, enrichLead } from "@/lib/actions";
import { Button, EmailStatus, SectionTitle, SourceLink, TierBadge } from "./ui";

export default function Leads() {
  const { leads, competitors, busy, drafts } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  if (!leads.length) return <p className="text-muted">No leads yet. Approve an ICP to run discovery.</p>;
  const sorted = [...leads].sort((a, b) => b.fitScore - a.fitScore);
  const enrichTop = async () => {
    for (const l of sorted.filter((l) => !l.enriched && l.domain).slice(0, 5)) await enrichLead(l.id);
  };
  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "px-3 py-2.5 align-top";
  return (
    <div>
      <SectionTitle kicker="Step 3 · Discovery & enrichment" title={`${leads.length} cited accounts`} sub="Every account is grounded in a retrieved web source. Click a row for signals, contacts and evidence." />
      <div className="mb-3 flex gap-2">
        <Button disabled={!!busy} onClick={enrichTop}>{busy ?? "Enrich top 5 (Hunter.io)"}</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-stone-50">
            <tr>
              <th className={th}>Account</th>
              <th className={th}>Fit / intent</th>
              <th className={th}>Industry · size</th>
              <th className={th}>Top signal</th>
              <th className={th}>Contacts</th>
              <th className={th}>Sources</th>
              <th className={th}>Stage</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const best = l.people.find((p) => p.email);
              const hasDrafts = drafts.some((d) => d.leadId === l.id);
              return (
                <Fragment key={l.id}>
                  <tr className="cursor-pointer border-b border-line hover:bg-stone-50" onClick={() => setOpen(open === l.id ? null : l.id)}>
                    <td className={td}>
                      <div className="font-medium">{l.company}</div>
                      <div className="font-mono text-[11px] text-muted">{l.domain || "no domain"}</div>
                    </td>
                    <td className={td}><TierBadge tier={l.tier} score={l.fitScore} /></td>
                    <td className={`${td} text-xs`}>{l.industry}<div className="text-muted">{l.sizeTier}{l.hq ? ` · ${l.hq}` : ""}</div></td>
                    <td className={`${td} max-w-xs text-xs`}>{l.signals[0]?.text ?? <span className="text-muted">—</span>}</td>
                    <td className={`${td} text-xs`}>
                      {best ? (
                        <div className="space-y-1">
                          <div>{best.name}</div>
                          <EmailStatus status={best.emailStatus} />
                        </div>
                      ) : l.enriched ? <EmailStatus status="not_found" /> : <EmailStatus />}
                    </td>
                    <td className={td}><span className="tabular text-xs">{l.sources.length}</span></td>
                    <td className={`${td} text-xs`}>{l.stage}{hasDrafts && <div className="text-[10px] text-ai">drafts queued</div>}</td>
                  </tr>
                  {open === l.id && (
                    <tr className="border-b border-line bg-stone-50/60">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-6 md:grid-cols-3">
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Why it fits</div>
                            <p className="text-sm">{l.whyFit}</p>
                            <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Evidence</div>
                            <div className="flex flex-wrap gap-1">{l.sources.map((s) => <SourceLink key={s.url} {...s} />)}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Buying signals</div>
                            {l.signals.length ? l.signals.map((s) => (
                              <div key={s.id} className="mb-2 text-sm">
                                <span className="mr-1 rounded bg-stone-200 px-1 text-[10px] uppercase">{s.type.replace("_", " ")}</span>
                                {s.text} <SourceLink {...s.source} />
                              </div>
                            )) : <p className="text-sm text-muted">No dated signal found.</p>}
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Contacts</div>
                            {l.people.length ? l.people.map((p) => (
                              <div key={p.id} className="mb-2 flex items-start justify-between gap-2 text-sm">
                                <div>
                                  <div className="font-medium">{p.name} <span className="font-normal text-muted">· {p.title}</span></div>
                                  <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted">
                                    {p.email ?? "no email"} {p.email && <EmailStatus status={p.emailStatus} />}
                                    {p.linkedin && <a className="text-accent" href={p.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
                                  </div>
                                </div>
                                <Button variant="ghost" className="shrink-0 !px-2 !py-1 text-xs" disabled={!!busy} onClick={() => draftOutreach(l.id, p.id)}>Draft</Button>
                              </div>
                            )) : <p className="text-sm text-muted">None yet.</p>}
                            <div className="mt-2 flex gap-2">
                              {!l.enriched && <Button variant="ghost" disabled={!!busy || !l.domain} onClick={() => enrichLead(l.id)}>Enrich contacts</Button>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {competitors.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 font-serif text-2xl">Competitive landscape</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {competitors.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-white p-4 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold">{c.name}</span>
                  <span className="rounded bg-stone-100 px-1.5 text-[10px] uppercase text-muted">{c.category}</span>
                </div>
                <p className="text-xs text-muted">{c.positioning}</p>
                <p className="mt-2 text-xs"><span className="font-medium">Pricing:</span> {c.pricing}</p>
                <p className="mt-1 text-xs"><span className="font-medium">Our edge:</span> {c.ourEdge}</p>
                <div className="mt-2"><SourceLink {...c.source} /></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
