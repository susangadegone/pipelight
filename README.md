# Pipelight: AI GTM Engine

**Describe your product in plain English. Pipelight infers who should buy it, finds real accounts and decision-makers with cited sources, verifies their emails, drafts signal-personalized outreach that a human approves, and tracks every lead through a pipeline with AI-vs-rep attribution.**

Early-stage B2B teams stitch together a strategy deck, Google searches, Apollo, ChatGPT, Gmail and a spreadsheet. Context is lost at every handoff, so targeting drifts and messages go generic. Pipelight keeps one context, from ICP to closed deal, and grounds every claim in a retrieved source.

## Why it's a business

- **Who buys:** seed to Series A B2B teams without RevOps, such as founders doing founder-led sales and first sales hires.
- **Wedge:** trust. Every lead is cited (no source, no lead), every message is grounded in a real signal, and every send is human-approved. Autonomous AI SDRs skip that gate and risk the sender's domain. Apollo and Clay give you data but no reasoning. ChatGPT gives you copy but no live evidence.
- **Model:** usage-based. Starter $149/mo (200 enriched leads), Growth $499/mo (1,000 leads, 3 seats), overage $0.40 per enriched lead.
- **Unit economics (estimated):** about $0.10–0.25 in API cost per fully worked lead (discovery, enrichment and 3 drafts) against $0.40 in revenue.

## What it does

| Step | What happens | Powered by |
|---|---|---|
| 1. Intake | Chat-style form: product, existing customers, pricing | — |
| 2. ICP | Industries (with NAICS), company size, personas, trigger events, negative signals. **Every field has a 0.00–1.00 confidence score.** Three adjacent expansion segments you can accept or dismiss | Claude (structured outputs) |
| 3. Discovery | Live web search across ICP-derived queries. Claude extracts accounts, people and dated buying signals. **A citation guard drops any lead whose source ID was not actually retrieved.** Negative-signal accounts are rejected with a reason. A competitor map covers positioning, public pricing and our edge | Tavily + Claude |
| 4. Enrichment | Business emails with verification status, LinkedIn URLs, HQ. Contacts ranked against ICP personas | Hunter.io |
| 5. Outreach | Per contact: email variant A, email variant B (different angles, for A/B testing) and a LinkedIn note, each built on that account's real signals | Claude |
| 6. HITL gateway | Review queue: edit inline, approve or reject. **Nothing is dispatched without a rep's approval.** Approved messages go to a sandbox outbox | — |
| 7. Pipeline | Kanban: Matched → Contacted → Replied → Meeting Booked → Closed Won/Lost. Drag-and-drop moves are logged as **Rep**; system-driven moves are logged as **AI** | — |
| 8. Graph | Company / Person / Signal / Competitor / Product nodes; `matched_to`, `works_at`, `has_signal`, `competes_with`, `uses`, `contacted_via` edges. Multi-hop insights: competitor displacement, co-mentioned accounts, signal clusters | — |
| 9. Analytics | Funnel conversion, conversion by industry and by tier/size, A/B variant reply rates, AI vs rep action counts, full timestamped audit log | — |

A live **Agent Thinking** panel streams Planner → Builder → Reviewer steps as the engine works.

## Quick start

```bash
git clone https://github.com/<you>/pipelight && cd pipelight
npm install
cp .env.example .env.local   # then fill in the three keys
npm run dev                  # http://localhost:3000
```

| Key | Get it at | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Yes |
| `TAVILY_API_KEY` | tavily.com (free tier) | Yes |
| `HUNTER_API_KEY` | hunter.io (free tier: 50 searches/month) | For enrichment |

Click **Load example** on the intake screen for a ready-made dental-software product, or describe your own.

## Honest scope (prototype)

- **Sending is sandboxed.** Approved messages are recorded in an outbox and the audit log, not sent. SendGrid or Gmail plug in at `approveAndSend` in `src/lib/actions.ts`. LinkedIn's messaging API requires partner approval.
- **Inbound replies are simulated** with a clearly labeled demo button standing in for the email-provider webhook.
- **The knowledge graph is modeled in-app** (typed nodes and edges computed from the workspace) instead of in Neo4j or Kùzu. The ontology is the same, so it ports directly to Cypher. See [ARCHITECTURE.md](ARCHITECTURE.md).
- **Workspace state lives in the browser** (localStorage), so each visitor gets an isolated workspace and no database is needed.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Zustand · Anthropic SDK (`claude-opus-5-5`, structured outputs via Zod) · Tavily Search API · Hunter.io API

See [ARCHITECTURE.md](ARCHITECTURE.md) for the system design, query logic, graph ontology and reasoning loops.
