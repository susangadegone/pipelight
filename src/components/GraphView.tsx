"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionTitle } from "./ui";
import { billing } from "@/lib/actions";

type Node = { id: string; label: string; kind: "Product" | "Company" | "Person" | "Signal" | "Competitor"; x: number; y: number; r: number; color: string };
type Edge = { from: string; to: string; rel: string };

const KIND_COLOR = { Product: "#1a1a17", Company: "#2f5bea", Person: "#0f766e", Signal: "#d97706", Competitor: "#e11d48" };

export default function GraphView() {
  const { leads, competitors, drafts } = useStore();
  const [sel, setSel] = useState<string | null>(null);

  const { nodes, edges, insights } = useMemo(() => {
    const W = 1000, H = 700, cx = W / 2, cy = H / 2;
    const nodes: Node[] = [{ id: "product", label: "Your product", kind: "Product", x: cx, y: cy, r: 18, color: KIND_COLOR.Product }];
    const edges: Edge[] = [];
    const top = [...leads].sort((a, b) => b.fitScore - a.fitScore).slice(0, 12);
    const R = 220;
    top.forEach((l, i) => {
      const a = (i / Math.max(top.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      nodes.push({ id: l.id, label: l.company, kind: "Company", x, y, r: 6 + l.fitScore / 12, color: KIND_COLOR.Company });
      edges.push({ from: "product", to: l.id, rel: "matched_to" });
      const sats = [
        ...l.people.slice(0, 2).map((p) => ({ id: p.id + l.id, label: p.name, kind: "Person" as const, rel: drafts.some((d) => d.personId === p.id && d.status === "sent") ? "contacted_via" : "works_at" })),
        ...l.signals.slice(0, 2).map((s) => ({ id: s.id + l.id, label: s.text, kind: "Signal" as const, rel: "has_signal" })),
      ];
      sats.forEach((s, j) => {
        const spread = (j - (sats.length - 1) / 2) * 0.42;
        const sx = x + Math.cos(a + spread) * 95, sy = y + Math.sin(a + spread) * 95;
        nodes.push({ id: s.id, label: s.label, kind: s.kind, x: sx, y: sy, r: 5, color: KIND_COLOR[s.kind] });
        edges.push({ from: l.id, to: s.id, rel: s.rel });
      });
    });
    competitors.slice(0, 6).forEach((c, i) => {
      const a = (i / Math.max(competitors.length, 1)) * Math.PI * 2 + 0.3;
      nodes.push({ id: c.id, label: c.name, kind: "Competitor", x: cx + Math.cos(a) * 95, y: cy + Math.sin(a) * 95, r: 7, color: KIND_COLOR.Competitor });
      edges.push({ from: c.id, to: "product", rel: "competes_with" });
      top.filter((l) => l.competitorsUsed.some((u) => u.toLowerCase().includes(c.name.toLowerCase()))).forEach((l) => edges.push({ from: l.id, to: c.id, rel: "uses" }));
    });

    // Multi-hop insights computed over the graph.
    const insights: string[] = [];
    const displacement = edges.filter((e) => e.rel === "uses");
    displacement.forEach((e) => insights.push(`Displacement: ${nodes.find((n) => n.id === e.from)?.label} → uses ${nodes.find((n) => n.id === e.to)?.label} → competes with your product`));
    const bySource = new Map<string, string[]>();
    leads.forEach((l) => l.sources.forEach((s) => bySource.set(s.url, [...(bySource.get(s.url) ?? []), l.company])));
    bySource.forEach((cos, url) => {
      if (cos.length > 1) {
        let host = url;
        try { host = new URL(url).hostname; } catch {}
        insights.push(`Co-mention: ${cos.slice(0, 3).join(", ")} appear together in ${host} (shared context for a referral-style opener)`);
      }
    });
    const byType = new Map<string, string[]>();
    leads.forEach((l) => l.signals.forEach((s) => byType.set(s.type, [...new Set([...(byType.get(s.type) ?? []), l.company])])));
    byType.forEach((cos, t) => cos.length > 1 && insights.push(`Signal cluster: ${cos.length} accounts share "${t.replace("_", " ")}" → run one sequence for ${cos.slice(0, 3).join(", ")}${cos.length > 3 ? "…" : ""}`));
    return { nodes, edges, insights };
  }, [leads, competitors, drafts]);

  if (!leads.length) return <p className="text-muted">Run discovery to populate the graph.</p>;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbors = new Set(sel ? edges.flatMap((e) => (e.from === sel ? [e.to] : e.to === sel ? [e.from] : [])) : []);
  const selNode = sel ? byId.get(sel) : null;

  return (
    <div>
      <SectionTitle kicker="Knowledge graph" title="Accounts, people, signals & competitors" sub="Nodes: Company, Person, Signal, Competitor, Product. Edges: matched_to, works_at, has_signal, competes_with, uses, contacted_via. Click a node to trace its relationships." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-line bg-white">
          <svg viewBox="0 0 1000 700" className="h-auto w-full">
            {edges.map((e, i) => {
              const a = byId.get(e.from), b = byId.get(e.to);
              if (!a || !b) return null;
              const hot = sel && (e.from === sel || e.to === sel);
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.rel === "uses" ? "#e11d48" : e.rel === "contacted_via" ? "#7c3aed" : "#cfcabe"} strokeWidth={hot ? 2 : 1} strokeDasharray={e.rel === "competes_with" ? "4 3" : undefined} opacity={sel && !hot ? 0.15 : 0.9} />
                  {hot && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} fontSize="10" fill="#6b6a63" textAnchor="middle">{e.rel}</text>}
                </g>
              );
            })}
            {nodes.map((n) => {
              const dim = sel && n.id !== sel && !neighbors.has(n.id);
              const showLabel = n.kind === "Company" || n.kind === "Product" || n.kind === "Competitor" || n.id === sel || neighbors.has(n.id);
              return (
                <g key={n.id} onClick={() => { if (sel !== n.id) billing("meter", { event: "graph_query", properties: { node: n.kind } }); setSel(sel === n.id ? null : n.id); }} className="cursor-pointer" opacity={dim ? 0.2 : 1}>
                  <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} stroke="white" strokeWidth={2} />
                  {showLabel && (
                    <text x={n.x} y={n.y - n.r - 4} fontSize={n.kind === "Company" ? 12 : 10} textAnchor="middle" fill="#1a1a17" fontWeight={n.kind === "Company" ? 600 : 400}>
                      {n.label.length > 34 ? n.label.slice(0, 34) + "…" : n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2 text-xs text-muted">
            {Object.entries(KIND_COLOR).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Selected</div>
            {selNode ? (
              <div className="text-sm">
                <div className="font-medium">{selNode.label}</div>
                <div className="mb-2 text-xs text-muted">{selNode.kind}</div>
                {edges.filter((e) => e.from === sel || e.to === sel).map((e, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-mono text-ai">{e.rel}</span> → {byId.get(e.from === sel ? e.to : e.from)?.label}
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted">Click any node.</p>}
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Multi-hop insights</div>
            {insights.length ? insights.slice(0, 8).map((s, i) => <p key={i} className="mb-2 text-xs">{s}</p>) : <p className="text-xs text-muted">No multi-hop patterns yet. More leads and signals surface more paths.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
