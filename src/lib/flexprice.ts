import "server-only";

// Flexprice usage-based billing: metering events, customer wallets, credit enforcement.
export const BASE = process.env.FLEXPRICE_BASE_URL || "https://us.api.flexprice.io/v1";

export const METERS = {
  lead_enriched: { name: "Leads Enriched", credits: 5 },
  outreach_sent: { name: "Outreach Sent", credits: 1 },
  graph_query: { name: "Graph Queries", credits: 1 },
} as const;
export type MeterEvent = keyof typeof METERS;
export const FREE_CREDITS = 40;
export const USD_PER_CREDIT = 0.08;

export function enabled() {
  return !!process.env.FLEXPRICE_API_KEY;
}

export async function fp<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { "x-api-key": process.env.FLEXPRICE_API_KEY ?? "", "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`Flexprice ${res.status} ${path}: ${text.slice(0, 200)}`), { status: res.status });
  return (text ? JSON.parse(text) : {}) as T;
}

const customerExternalId = (ws: string) => `pipelight-ws-${ws.replace(/[^a-z0-9-]/gi, "").slice(0, 40)}`;

type Customer = { id: string; external_id: string };
type Wallet = { id: string; credit_balance?: string | number; balance?: string | number; wallet_status?: string };

/** Ensure a Flexprice customer + prepaid wallet (seeded with free credits) exists for this workspace. */
export async function ensureAccount(ws: string): Promise<{ customer: Customer; wallet: Wallet }> {
  const ext = customerExternalId(ws);
  let customer: Customer;
  try {
    customer = await fp<Customer>(`/customers/external/${encodeURIComponent(ext)}`);
  } catch (e) {
    if ((e as { status?: number }).status !== 404) throw e;
    customer = await fp<Customer>("/customers", { method: "POST", body: { external_id: ext, name: `Pipelight workspace ${ws.slice(0, 8)}` } });
  }
  const list = await fp<Wallet[] | { items?: Wallet[] }>(`/customers/${customer.id}/wallets`);
  const wallets = Array.isArray(list) ? list : (list.items ?? []);
  let wallet = wallets.find((w) => (w.wallet_status ?? "active").toLowerCase() === "active");
  if (!wallet) {
    wallet = await fp<Wallet>("/wallets", {
      method: "POST",
      body: { customer_id: customer.id, currency: "usd", wallet_type: "PRE_PAID", conversion_rate: String(USD_PER_CREDIT), initial_credits_to_load: String(FREE_CREDITS), description: "Pipelight credits" },
    });
  }
  return { customer, wallet };
}

export async function ingest(ws: string, event: MeterEvent, properties: Record<string, string> = {}) {
  return fp("/events", {
    method: "POST",
    body: {
      event_name: event,
      external_customer_id: customerExternalId(ws),
      event_id: `${event}-${ws.slice(0, 12)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      properties: { ...properties, credits: String(METERS[event].credits) },
      source: "pipelight",
      timestamp: new Date().toISOString(),
    },
  });
}

/** Usage per meter for this workspace, aggregated by Flexprice (COUNT meters). */
export async function usage(ws: string): Promise<Record<MeterEvent, number>> {
  const meterIds = await meterIdsByEvent();
  const window = { start_time: new Date(Date.now() - 30 * 864e5).toISOString(), end_time: new Date(Date.now() + 60e3).toISOString() };
  const keys = Object.keys(METERS) as MeterEvent[];
  const values = await Promise.all(
    keys.map(async (k) => {
      if (!meterIds[k]) return 0;
      const r = await fp<{ value?: number | string }>("/events/usage/meter", { method: "POST", body: { meter_id: meterIds[k], external_customer_id: customerExternalId(ws), ...window } });
      return Number(r.value ?? 0);
    }),
  );
  return Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Record<MeterEvent, number>;
}

let meterCache: Record<string, string> | null = null;
/** event_name → meter_id, from the features created by scripts/flexprice-setup.mjs. */
async function meterIdsByEvent(): Promise<Record<string, string>> {
  if (meterCache) return meterCache;
  type F = { lookup_key?: string; meter_id?: string };
  const res = await fp<{ items?: F[] }>("/features/search", { method: "POST", body: { limit: 100 } });
  meterCache = Object.fromEntries((res.items ?? []).filter((f) => f.lookup_key && f.meter_id).map((f) => [f.lookup_key!, f.meter_id!]));
  return meterCache;
}

export async function walletCredits(walletId: string): Promise<number> {
  const b = await fp<{ credit_balance?: string | number; real_time_credit_balance?: string | number }>(`/wallets/${walletId}/balance/real-time`);
  return Number(b.credit_balance ?? b.real_time_credit_balance ?? 0);
}

export async function status(ws: string) {
  const { customer, wallet } = await ensureAccount(ws);
  const [granted, used] = await Promise.all([walletCredits(wallet.id), usage(ws)]);
  const consumed = (Object.keys(used) as MeterEvent[]).reduce((s, k) => s + used[k] * METERS[k].credits, 0);
  return { customerId: customer.id, walletId: wallet.id, granted, used, consumed, remaining: Math.max(0, granted - consumed), meters: METERS, usdPerCredit: USD_PER_CREDIT };
}
