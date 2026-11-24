import { enabled, fp, ingest, status, ensureAccount, type MeterEvent } from "@/lib/flexprice";

const CLIENT_METERED: MeterEvent[] = ["outreach_sent", "graph_query"];

export async function POST(req: Request) {
  if (!enabled()) return Response.json({ enabled: false });
  try {
    const { ws, action, event, properties, credits } = await req.json();
    if (!ws) return Response.json({ error: "Missing workspace id" }, { status: 400 });

    if (action === "meter") {
      if (!CLIENT_METERED.includes(event)) return Response.json({ error: "Unknown meter" }, { status: 400 });
      await ingest(ws, event, properties ?? {});
    } else if (action === "topup") {
      const { wallet } = await ensureAccount(ws);
      const n = Math.min(500, Math.max(1, Number(credits) || 50));
      await fp(`/wallets/${wallet.id}/top-up`, {
        method: "POST",
        body: { credits_to_add: String(n), transaction_reason: "FREE_CREDIT_GRANT", description: "Pipelight demo top-up", idempotency_key: `topup-${ws.slice(0, 12)}-${Date.now()}` },
      });
    }
    return Response.json({ enabled: true, ...(await status(ws)) });
  } catch (e) {
    console.error(e);
    return Response.json({ enabled: true, error: (e as Error).message }, { status: 502 });
  }
}
