import { z } from "zod";
import { structured, errorResponse } from "@/lib/claude";

export const maxDuration = 120;

const conf = z.number().describe("Confidence 0.00-1.00 in this inference, based on how directly the intake supports it");

const IcpSchema = z.object({
  summary: z.string().describe("One-sentence ICP statement"),
  industries: z.array(z.object({ name: z.string(), naics: z.string().describe("Best-fit NAICS code"), confidence: conf })),
  companySize: z.object({ headcount: z.string(), revenue: z.string(), confidence: conf }),
  personas: z.array(z.object({ title: z.string(), seniority: z.string(), why: z.string(), confidence: conf })),
  triggers: z.array(z.object({ event: z.string(), confidence: conf })),
  negativeSignals: z.array(z.string()).describe("Signals that disqualify an account, e.g. hiring freeze, wrong region"),
  geographies: z.array(z.string()),
  expansions: z.array(
    z.object({ segment: z.string(), reasoning: z.string().describe("Evidence-based reason this adjacent segment could buy"), confidence: conf }),
  ),
  searchQueries: z.array(z.string()).describe("5 web search queries that would surface specific real companies matching this ICP showing a trigger event right now"),
  competitorQueries: z.array(z.string()).describe("2 web search queries to find competitors and their pricing"),
});

export async function POST(req: Request) {
  try {
    const { product, customers, pricing } = await req.json();
    if (!product?.trim()) return Response.json({ error: "Describe the product first." }, { status: 400 });
    const icp = await structured({
      schema: IcpSchema,
      effort: "medium",
      system:
        "You are a B2B go-to-market strategist. Infer a precise Ideal Customer Profile from a founder's plain-language intake. Be specific (not 'tech companies'). Confidence scores must be honest: lower them when you are extrapolating beyond what the intake says. Give 3-5 industries, 2-4 personas, 3-5 triggers, and exactly 3 non-obvious adjacent expansion segments.",
      prompt: `PRODUCT:\n${product}\n\nEXISTING CUSTOMERS / WINS:\n${customers || "(none given)"}\n\nPRICING / CONTRACT VALUE:\n${pricing || "(none given)"}\n\nToday's date: ${new Date().toISOString().slice(0, 10)}`,
    });
    return Response.json({
      icp: {
        ...icp,
        expansions: icp.expansions.map((e, i) => ({ ...e, id: `exp-${i}`, status: "suggested" })),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
