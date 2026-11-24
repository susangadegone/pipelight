import { z } from "zod";
import { structured, errorResponse } from "@/lib/claude";
import { tavilySearch, type SearchResult } from "@/lib/tavily";

export const maxDuration = 300;

const DiscoverySchema = z.object({
  leads: z.array(
    z.object({
      company: z.string(),
      domain: z.string().describe("Company's own website domain, e.g. acme.com. Empty string if unknown."),
      industry: z.string(),
      sizeTier: z.enum(["SMB", "Mid-Market", "Enterprise"]),
      hq: z.string(),
      whyFit: z.string().describe("1-2 sentences tying the company to the ICP, citing evidence"),
      fitScore: z.number().describe("0-100 composite fit + intent score"),
      signals: z.array(
        z.object({
          text: z.string().describe("Concrete, dated-if-possible buying signal found in the source"),
          type: z.enum(["funding", "hiring", "exec_hire", "expansion", "tech_change", "product_launch", "partnership", "other"]),
          sourceId: z.string().describe("ID like S3 of the source that states this"),
        }),
      ),
      people: z.array(
        z.object({ name: z.string(), title: z.string(), sourceId: z.string() }),
      ).describe("Only people explicitly named in a source. Empty if none."),
      competitorsUsed: z.array(z.string()).describe("Competing products the source says this company uses. Usually empty."),
      sourceIds: z.array(z.string()).describe("All source IDs that mention this company"),
    }),
  ),
  competitors: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["direct", "indirect", "alternative"]),
      positioning: z.string(),
      pricing: z.string().describe("Publicly listed pricing, or 'Not public'"),
      ourEdge: z.string().describe("Our structural advantage vs them"),
      sourceId: z.string(),
    }),
  ),
  rejected: z.array(z.object({ company: z.string(), reason: z.string() })).describe("Companies seen but excluded due to negative signals or poor fit"),
});

const DIRECTORIES = /(linkedin|facebook|instagram|yelp|indeed|glassdoor|dentalpost|ziprecruiter|zocdoc|healthgrades|google|bing|youtube|twitter|x\.com|bbb\.org|mapquest|yellowpages|crunchbase|pitchbook|bloomberg|wikipedia|prnewswire|businesswire|pehub|reddit|tiktok|nextdoor|opencare|webmd|vitals|ratemds|doximity|npiregistry|npino)/i;

function resolveDomain(company: string, urls: string[]): string {
  const tokens = company.toLowerCase().replace(/&/g, " ").split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !["the", "and", "llc", "inc", "ltd", "corp", "company", "group", "partners", "services", "center"].includes(t));
  for (const u of urls) {
    let host: string;
    try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { continue; }
    if (DIRECTORIES.test(host)) continue;
    const base = host.split(".").slice(0, -1).join("");
    if (tokens.some((t) => base.includes(t))) return host;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const { icp, product } = await req.json();
    const steps: string[] = [];
    const queries: string[] = [...(icp.searchQueries ?? []).slice(0, 5), ...(icp.competitorQueries ?? []).slice(0, 2)];
    steps.push(`Planner: running ${queries.length} live web searches`);

    const settled = await Promise.allSettled(queries.map((q) => tavilySearch(q, 6)));
    const sources: (SearchResult & { id: string })[] = [];
    const seen = new Set<string>();
    settled.forEach((s, i) => {
      if (s.status === "rejected") {
        steps.push(`Search failed for "${queries[i]}": ${s.reason}`);
        return;
      }
      steps.push(`Search "${queries[i]}" → ${s.value.length} results`);
      for (const r of s.value) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        sources.push({ ...r, id: `S${sources.length + 1}` });
      }
    });
    if (!sources.length) return Response.json({ error: "Web search returned nothing.", steps }, { status: 502 });

    steps.push(`Builder: extracting accounts from ${sources.length} unique sources`);
    const corpus = sources.map((s) => `[${s.id}] ${s.title}\nURL: ${s.url}\n${s.content}`).join("\n\n");

    const out = await structured({
      schema: DiscoverySchema,
      effort: "medium",
      system:
        "You extract B2B prospects from web search results. HARD RULES: only include companies, people, and signals that are explicitly stated in the provided sources; every claim must reference a source ID; never invent people, emails, or facts. Exclude listicle publishers, directories, and the seller's own competitors from leads (put competitors in the competitors list). Exclude accounts matching negative signals and list them in rejected. Return up to 12 leads, best first.",
      prompt: `SELLER PRODUCT:\n${product}\n\nICP:\n${JSON.stringify({ summary: icp.summary, industries: icp.industries, companySize: icp.companySize, personas: icp.personas, triggers: icp.triggers, negativeSignals: icp.negativeSignals, geographies: icp.geographies }, null, 1)}\n\nSOURCES:\n${corpus}`,
    });

    // Citation guard: drop anything whose source ID doesn't exist in what we actually retrieved.
    const byId = new Map(sources.map((s) => [s.id, { url: s.url, title: s.title }]));
    let dropped = 0;
    const leads = out.leads
      .map((l, i) => {
        const srcs = l.sourceIds.map((id) => byId.get(id)).filter(Boolean) as { url: string; title: string }[];
        if (!srcs.length) {
          dropped++;
          return null;
        }
        const fit = Math.max(0, Math.min(100, Math.round(l.fitScore)));
        return {
          id: `lead-${Date.now()}-${i}`,
          company: l.company,
          domain: l.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0],
          industry: l.industry,
          sizeTier: l.sizeTier,
          hq: l.hq,
          whyFit: l.whyFit,
          fitScore: fit,
          tier: fit >= 75 ? "A" : fit >= 55 ? "B" : "C",
          signals: l.signals
            .filter((s) => byId.has(s.sourceId))
            .map((s, j) => ({ id: `sig-${i}-${j}`, text: s.text, type: s.type, source: byId.get(s.sourceId)! })),
          people: l.people
            .filter((p) => byId.has(p.sourceId))
            .map((p, j) => ({ id: `p-${i}-${j}`, name: p.name, title: p.title, source: byId.get(p.sourceId)! })),
          sources: srcs,
          competitorsUsed: l.competitorsUsed,
          stage: "Matched",
          enriched: false,
          createdAt: Date.now(),
        };
      })
      .filter(Boolean);
    const competitors = out.competitors
      .filter((c) => byId.has(c.sourceId))
      .map((c, i) => ({ id: `comp-${i}`, name: c.name, category: c.category, positioning: c.positioning, pricing: c.pricing, ourEdge: c.ourEdge, source: byId.get(c.sourceId)! }));

    // Resolve missing domains with a targeted search; accept only domains that match the company name.
    const missing = leads.filter((l) => l && !l.domain);
    if (missing.length) {
      steps.push(`Builder: resolving ${missing.length} missing company domains`);
      await Promise.all(
        missing.map(async (l) => {
          try {
            const results = await tavilySearch(`${l!.company} ${l!.hq ?? ""} official website`, 5);
            const d = resolveDomain(l!.company, results.map((r) => r.url));
            if (d) l!.domain = d;
          } catch {}
        }),
      );
      steps.push(`Builder: resolved ${missing.filter((l) => l!.domain).length}/${missing.length} domains`);
    }

    steps.push(`Reviewer: ${leads.length} leads passed citation check${dropped ? `, ${dropped} dropped for missing sources` : ""}`);
    for (const r of out.rejected.slice(0, 5)) steps.push(`Reviewer: rejected ${r.company} — ${r.reason}`);
    steps.push(`Mapped ${competitors.length} competitors`);

    return Response.json({ leads, competitors, steps, sourceCount: sources.length });
  } catch (e) {
    return errorResponse(e);
  }
}
