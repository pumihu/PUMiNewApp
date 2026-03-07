import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: null,
    priceNote: "Forever free",
    features: [
      "3 workspaces",
      "50 mentor messages / month",
      "5 canvas blocks per workspace",
      "Basic creative tools",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    id: "builder",
    name: "Builder",
    price: 15,
    priceNote: "per month",
    features: [
      "Unlimited workspaces",
      "Unlimited mentor messages",
      "Unlimited canvas blocks",
      "Full creative mode",
      "Document summarization",
      "TTS (text-to-speech)",
    ],
    cta: "Start building",
    highlight: true,
  },
  {
    id: "creator",
    name: "Creator",
    price: 20,
    priceNote: "/ month for first 3 months, then €25",
    features: [
      "Everything in Builder",
      "Priority AI (faster responses)",
      "Visual directions & storyboard",
      "Advanced creative brief engine",
      "Early access to new features",
    ],
    cta: "Go creative",
    highlight: false,
  },
];

export default function PricingPage() {
  const { isLoggedIn, startCheckout } = useAuth();

  const handleCta = (planId: string) => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    if (planId === "builder") startCheckout("GEN_Z");
    if (planId === "creator") startCheckout("MILLENIAL");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-semibold tracking-tight mb-3">Choose your plan</h1>
          <p className="text-neutral-400 text-base max-w-lg mx-auto">
            Start free. Upgrade when your work demands more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 bg-neutral-900 text-white"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full border border-neutral-700">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-1">{plan.name}</h2>
                {plan.price ? (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold">€{plan.price}</span>
                    <span
                      className={`text-sm mb-1 ${plan.highlight ? "text-neutral-600" : "text-neutral-400"}`}
                    >
                      {plan.priceNote}
                    </span>
                  </div>
                ) : (
                  <p className={`text-sm ${plan.highlight ? "text-neutral-600" : "text-neutral-400"}`}>
                    {plan.priceNote}
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlight ? "text-black" : "text-emerald-500"}`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCta(plan.id)}
                className={
                  plan.highlight
                    ? "bg-black text-white hover:bg-neutral-800 w-full"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20 w-full"
                }
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-neutral-600 text-xs mt-10">
          All prices in EUR. Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
