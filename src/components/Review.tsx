"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { approveAndSend, rejectDraft } from "@/lib/actions";
import { Button, SectionTitle } from "./ui";

export default function Review() {
  const { drafts, leads, updateDraft } = useStore();
  const [filter, setFilter] = useState<"pending" | "sent" | "rejected">("pending");
  const shown = drafts.filter((d) => d.status === filter);
  const counts = { pending: 0, sent: 0, rejected: 0, approved: 0 } as Record<string, number>;
  drafts.forEach((d) => counts[d.status]++);
  return (
    <div className="max-w-4xl">
      <SectionTitle kicker="Step 4 · Human-in-the-loop gateway" title="Review queue" sub="Nothing leaves Pipelight without a rep's approval. Edit inline, approve one variant per channel, or reject. Approved messages go to a sandbox outbox (no live sending in this demo)." />
      <div className="mb-4 flex gap-1 rounded-lg bg-stone-100 p-1 text-sm w-fit">
        {(["pending", "sent", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 capitalize ${filter === f ? "bg-white shadow-sm" : "text-muted"}`}>
            {f === "sent" ? "Approved & sent" : f} <span className="tabular text-muted">{counts[f]}</span>
          </button>
        ))}
      </div>
      {!shown.length && <p className="text-sm text-muted">{filter === "pending" ? "Queue is empty. Draft outreach from the Leads table." : "Nothing here yet."}</p>}
      <div className="space-y-4">
        {shown.map((d) => {
          const lead = leads.find((l) => l.id === d.leadId);
          const person = lead?.people.find((p) => p.id === d.personId);
          return (
            <div key={d.id} className="rounded-xl border border-line bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-semibold uppercase ${d.channel === "email" ? "bg-blue-50 text-accent" : "bg-sky-50 text-sky-700"}`}>{d.channel}</span>
                {d.channel === "email" && <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono">Variant {d.variant}</span>}
                <span className="text-muted">Angle: {d.angle}</span>
                <span className="ml-auto text-muted">
                  To <span className="font-medium text-ink">{person?.name}</span>, {person?.title} · {lead?.company}
                  {person?.email && d.channel === "email" && <span className="font-mono"> &lt;{person.email}&gt;</span>}
                </span>
              </div>
              {d.channel === "email" && (
                <input
                  disabled={d.status !== "pending"}
                  className="mb-2 w-full rounded-md border border-line px-3 py-1.5 text-sm font-medium disabled:bg-stone-50"
                  value={d.subject ?? ""}
                  onChange={(e) => updateDraft(d.id, { subject: e.target.value, editedByRep: true })}
                />
              )}
              <textarea
                disabled={d.status !== "pending"}
                rows={d.channel === "email" ? 8 : 3}
                className="w-full rounded-md border border-line px-3 py-2 text-sm leading-relaxed disabled:bg-stone-50"
                value={d.body}
                onChange={(e) => updateDraft(d.id, { body: e.target.value, editedByRep: true })}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {d.signalsUsed.map((s) => (
                  <span key={s} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800 ring-1 ring-amber-200" title="Signal woven into this message">⚡ {s.length > 70 ? s.slice(0, 70) + "…" : s}</span>
                ))}
                {d.editedByRep && <span className="text-[10px] font-medium text-rep">edited by rep</span>}
                {d.status === "pending" && (
                  <div className="ml-auto flex gap-2">
                    <Button variant="danger" onClick={() => rejectDraft(d.id)}>Reject</Button>
                    <Button variant="ok" disabled={d.channel === "email" && !person?.email} onClick={() => approveAndSend(d.id)}>
                      {d.channel === "email" && !person?.email ? "No verified email" : "Approve & send"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
