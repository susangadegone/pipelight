"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { STAGES, type Stage } from "@/lib/types";
import { ActorTag, Button, SectionTitle, TierBadge } from "./ui";

export default function Pipeline() {
  const { leads, moveLead, audit } = useStore();
  const [dragging, setDragging] = useState<string | null>(null);
  const lastActor = (leadId: string) => audit.find((a) => a.leadId === leadId && a.action.startsWith("Stage"))?.actor;

  const simulateReply = () => {
    const contacted = leads.filter((l) => l.stage === "Contacted");
    if (!contacted.length) return alert("No contacted leads yet. Approve & send a draft first.");
    const l = contacted[Math.floor(Math.random() * contacted.length)];
    moveLead(l.id, "Replied", "ai", "inbound reply detected (simulated webhook)");
  };

  return (
    <div>
      <SectionTitle kicker="Step 5 · Pipeline" title="Lead lifecycle" sub="Drag cards to move them (logged as Rep). Moves made by the engine are tagged AI." />
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" onClick={simulateReply}>Demo: simulate inbound reply</Button>
        <span className="text-xs text-muted">Stands in for the email-provider webhook in this prototype.</span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage).sort((a, b) => b.fitScore - a.fitScore);
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragging && moveLead(dragging, stage as Stage, "rep")}
              className="min-h-[60vh] rounded-xl border border-line bg-stone-50 p-2"
            >
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {stage} <span className="tabular">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((l) => {
                  const actor = lastActor(l.id);
                  return (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => setDragging(l.id)}
                      onDragEnd={() => setDragging(null)}
                      className="cursor-grab rounded-lg border border-line bg-white p-2.5 text-xs shadow-sm active:cursor-grabbing"
                    >
                      <div className="mb-1 font-medium text-sm leading-tight">{l.company}</div>
                      <div className="mb-1.5 text-muted">{l.industry}</div>
                      <div className="flex items-center justify-between">
                        <TierBadge tier={l.tier} score={l.fitScore} />
                        {actor && <ActorTag actor={actor} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
