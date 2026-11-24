"use client";
import { useStore } from "@/lib/store";
import { generateIcp } from "@/lib/actions";
import { Button, SectionTitle } from "./ui";

const EXAMPLE = {
  product:
    "Pipelight Voice: an AI phone receptionist for dental clinics. Answers every call 24/7, books and reschedules appointments directly into Dentrix and Open Dental, answers insurance-coverage questions, and texts patients reminders. HIPAA compliant, live in one day.",
  customers: "12 independent dental practices and one 8-location dental service organization (DSO) in Texas. Best results at practices missing 30%+ of inbound calls.",
  pricing: "$399/month per location, annual contracts. DSOs typically 5-40 locations ($24k-$190k ACV).",
};

export default function Intake({ onDone }: { onDone: () => void }) {
  const { intake, setIntake, busy } = useStore();
  const field = "w-full rounded-lg border border-line bg-white p-3 text-sm leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-blue-100";
  return (
    <div className="max-w-3xl">
      <SectionTitle kicker="Step 1 · Product intake" title="What are you selling?" sub="Describe your product in plain language. Pipelight infers your ideal customer, finds real accounts with sources, and drafts outreach you approve." />
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Product, features & constraints</span>
          <textarea rows={5} className={field} value={intake.product} onChange={(e) => setIntake({ product: e.target.value })} placeholder="What does it do, for whom, and what makes it different?" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Existing customers & reference wins <span className="font-normal text-muted">(optional)</span></span>
          <textarea rows={2} className={field} value={intake.customers} onChange={(e) => setIntake({ customers: e.target.value })} placeholder="Who buys today? Which wins went best?" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Pricing & contract value <span className="font-normal text-muted">(optional)</span></span>
          <input className={field} value={intake.pricing} onChange={(e) => setIntake({ pricing: e.target.value })} placeholder="e.g. $499/mo per seat, annual" />
        </label>
        <div className="flex items-center gap-3">
          <Button disabled={!intake.product.trim() || !!busy} onClick={async () => (await generateIcp()) && onDone()}>
            {busy ?? "Infer ideal customer profile →"}
          </Button>
          <Button variant="ghost" disabled={!!busy} onClick={() => setIntake(EXAMPLE)}>
            Load example
          </Button>
        </div>
      </div>
    </div>
  );
}
