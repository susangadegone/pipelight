import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

const client = new Anthropic();
export const MODEL = "claude-opus-5-5";

/** One structured-output call: returns data validated against the zod schema. */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: { format: zodOutputFormat(opts.schema), effort: opts.effort ?? "low" },
  });
  if (res.stop_reason === "refusal") throw new Error("Model declined this request.");
  if (!res.parsed_output) throw new Error(`No structured output (stop_reason: ${res.stop_reason})`);
  return res.parsed_output as z.infer<S>;
}

export function errorResponse(e: unknown, status = 500) {
  const message =
    e instanceof Anthropic.APIError ? `Claude API error ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
  console.error(message);
  return Response.json({ error: message }, { status });
}
