import { z } from "zod";
import { structured, errorResponse } from "@/lib/claude";

export const maxDuration = 120;

const DraftSchema = z.object({
  emailA: z.object({ angle: z.string(), subject: z.string(), body: z.string(), signalsUsed: z.array(z.string()) }),
  emailB: z.object({ angle: z.string(), subject: z.string(), body: z.string(), signalsUsed: z.array(z.string()) }),
  linkedin: z.object({ angle: z.string(), body: z.string(), signalsUsed: z.array(z.string()) }),
});

export async function POST(req: Request) {
  try {
    const { lead, person, product, icp } = await req.json();
    const persona = icp?.personas?.find((p: { title: string }) => person.title.toLowerCase().includes(p.title.toLowerCase().split(" ")[0])) ?? icp?.personas?.[0];
    const out = await structured({
      schema: DraftSchema,
      effort: "low",
      system: `You write cold B2B outreach that gets replies. Rules:
- Open with the prospect's specific, real trigger signal (from the provided signals only, never invent facts).
- One clear value proposition tied to that signal; one low-friction CTA (a question, not a demand for 30 minutes).
- Email: under 110 words, plain text, no buzzwords, no "I hope this finds you well". Subject under 7 words, lowercase ok.
- LinkedIn connection note: under 280 characters.
- emailA and emailB must test DIFFERENT angles (e.g. cost/ROI vs. speed/risk), and the angle field names it in 2-4 words.
- Tone for a ${person.title}: ${persona?.seniority?.toLowerCase().includes("c") ? "concise, strategic, outcome-focused" : "practical and specific"}.
- signalsUsed lists the exact signal texts you referenced.
- Sign off as "{{sender_name}}".`,
      prompt: `SELLER PRODUCT:\n${product}\n\nPROSPECT: ${person.name}, ${person.title} at ${lead.company} (${lead.industry}, ${lead.sizeTier}, ${lead.hq ?? ""})\nWHY THEY FIT: ${lead.whyFit}\nSIGNALS:\n${lead.signals.map((s: { text: string }) => `- ${s.text}`).join("\n") || "- (none found; lean on industry fit, do not invent news)"}\nPERSONA PAIN: ${persona?.why ?? ""}`,
    });
    return Response.json(out);
  } catch (e) {
    return errorResponse(e);
  }
}
