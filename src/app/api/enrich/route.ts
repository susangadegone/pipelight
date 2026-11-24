import { errorResponse } from "@/lib/claude";
import { enabled as billingEnabled, charge, status, METERS } from "@/lib/flexprice";

// Contact enrichment via Hunter.io domain search (1 search credit per call).
export async function POST(req: Request) {
  try {
    const { domain, personaKeywords, ws } = (await req.json()) as { domain: string; personaKeywords?: string[]; ws?: string };
    if (!domain) return Response.json({ error: "No domain to enrich." }, { status: 400 });
    const key = process.env.HUNTER_API_KEY;
    if (!key) return Response.json({ error: "HUNTER_API_KEY not set" }, { status: 501 });

    // Credit gate (Flexprice): block the high-cost enrichment pipeline when the wallet can't cover it.
    if (billingEnabled() && ws) {
      const s = await status(ws);
      if (s.remaining < METERS.lead_enriched.credits)
        return Response.json({ error: `Out of credits: enrichment needs ${METERS.lead_enriched.credits}, ${s.remaining} left. Top up in Billing.`, code: "insufficient_credits", billing: s }, { status: 402 });
    }

    const url = new URL("https://api.hunter.io/v2/domain-search");
    url.searchParams.set("domain", domain);
    url.searchParams.set("limit", "10");
    url.searchParams.set("type", "personal");
    url.searchParams.set("api_key", key);
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data?.errors?.[0]?.details ?? `Hunter ${res.status}` }, { status: res.status });

    const d = data.data ?? {};
    type HunterEmail = {
      value: string; first_name?: string; last_name?: string; position?: string; seniority?: string;
      linkedin?: string; confidence?: number; verification?: { status?: string }; sources?: { uri: string }[];
    };
    const kw = (personaKeywords ?? []).map((k) => k.toLowerCase());
    const rank = (e: HunterEmail) => {
      const pos = (e.position ?? "").toLowerCase();
      let s = e.seniority === "executive" ? 3 : e.seniority === "senior" ? 2 : 0;
      if (kw.some((k) => k && pos.includes(k))) s += 4;
      return s + (e.confidence ?? 0) / 100;
    };
    const people = ((d.emails ?? []) as HunterEmail[])
      .filter((e) => e.first_name && e.last_name)
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, 4)
      .map((e, i) => {
        const v = e.verification?.status;
        return {
          id: `h-${domain}-${i}`,
          name: `${e.first_name} ${e.last_name}`,
          title: e.position || "Unknown title",
          email: e.value,
          emailStatus: v === "valid" ? "verified" : v === "accept_all" || v === "unknown" || !v ? "unknown" : "risky",
          emailConfidence: e.confidence ?? 0,
          linkedin: e.linkedin || undefined,
          source: e.sources?.[0] ? { url: e.sources[0].uri, title: "Hunter.io public source" } : { url: `https://hunter.io/search/${domain}`, title: "Hunter.io" },
        };
      });

    if (billingEnabled() && ws) await charge(ws, "lead_enriched", { domain, contacts: String(people.length) }).catch((e) => console.error(e));

    return Response.json({
      people,
      company: { name: d.organization, hq: [d.city, d.country].filter(Boolean).join(", "), pattern: d.pattern, acceptsAll: d.accept_all, mx: !d.disposable && !d.webmail },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
