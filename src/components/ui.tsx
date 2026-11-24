"use client";
import type { ReactNode } from "react";

export async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted tabular" title={`Inference confidence ${value.toFixed(2)}`}>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-line">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      {value.toFixed(2)}
    </span>
  );
}

export function TierBadge({ tier, score }: { tier: "A" | "B" | "C"; score: number }) {
  const cls = tier === "A" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : tier === "B" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-stone-100 text-stone-600 ring-stone-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 tabular ${cls}`}>
      Tier {tier} · {score}
    </span>
  );
}

export function ActorTag({ actor }: { actor: "ai" | "rep" }) {
  return actor === "ai" ? (
    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ai ring-1 ring-violet-200">AI</span>
  ) : (
    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rep ring-1 ring-teal-200">Rep</span>
  );
}

export function EmailStatus({ status }: { status?: string }) {
  const map: Record<string, [string, string]> = {
    verified: ["✓ verified", "text-emerald-700 bg-emerald-50 ring-emerald-200"],
    unknown: ["? unconfirmed", "text-amber-700 bg-amber-50 ring-amber-200"],
    risky: ["! risky", "text-rose-700 bg-rose-50 ring-rose-200"],
    not_found: ["not found", "text-stone-500 bg-stone-100 ring-stone-200"],
  };
  const [label, cls] = map[status ?? ""] ?? ["not enriched", "text-stone-500 bg-stone-50 ring-stone-200"];
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${cls}`}>{label}</span>;
}

export function Button({ children, onClick, disabled, variant = "primary", className = "" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "ghost" | "danger" | "ok"; className?: string }) {
  const v = {
    primary: "bg-ink text-white hover:bg-black",
    ghost: "bg-white text-ink ring-1 ring-line hover:bg-stone-50",
    danger: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
    ok: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${v} ${className}`}>
      {children}
    </button>
  );
}

export function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{kicker}</div>
      <h1 className="font-serif text-4xl leading-tight">{title}</h1>
      {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function SourceLink({ url, title }: { url: string; title?: string }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <a href={url} target="_blank" rel="noreferrer" title={title} className="inline-flex max-w-[14rem] items-center gap-1 truncate rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-accent ring-1 ring-blue-100 hover:underline">
      ↗ {host}
    </a>
  );
}
