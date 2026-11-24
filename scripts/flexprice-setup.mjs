// One-time setup: finds your Flexprice region and creates Pipelight's metered features.
// Usage: node --env-file=.env.local scripts/flexprice-setup.mjs
const KEY = process.env.FLEXPRICE_API_KEY;
if (!KEY) throw new Error("FLEXPRICE_API_KEY missing");

const REGIONS = ["https://us.api.flexprice.io/v1", "https://api.cloud.flexprice.io/v1", "https://eu.api.flexprice.io/v1", "https://canada.api.flexprice.io/v1"];
const call = async (base, path, method = "GET", body) => {
  const r = await fetch(base + path, { method, headers: { "x-api-key": KEY, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  return { status: r.status, body: await r.text() };
};

let base;
for (const b of process.env.FLEXPRICE_BASE_URL ? [process.env.FLEXPRICE_BASE_URL] : REGIONS) {
  const r = await call(b, "/features/search", "POST", { limit: 50 });
  console.log(`region ${b} → ${r.status}`);
  if (r.status === 200) { base = b; break; }
}
if (!base) throw new Error("API key not accepted in any region");
console.log("BASE_URL", base);

const existing = JSON.parse((await call(base, "/features/search", "POST", { limit: 100 })).body);
const have = new Set((existing.items ?? []).map((f) => f.lookup_key));

const FEATURES = [
  ["lead_enriched", "Leads Enriched", "lead", "leads"],
  ["outreach_sent", "Outreach Sent", "message", "messages"],
  ["graph_query", "Graph Queries", "query", "queries"],
];
for (const [event, name, one, many] of FEATURES) {
  if (have.has(event)) { console.log(`exists: ${event}`); continue; }
  const r = await call(base, "/features", "POST", {
    name, type: "metered", lookup_key: event, unit_singular: one, unit_plural: many,
    meter: { name: `${name} meter`, event_name: event, aggregation: { type: "COUNT" }, reset_usage: "NEVER" },
  });
  console.log(`create ${event} → ${r.status} ${r.body.slice(0, 160)}`);
}
