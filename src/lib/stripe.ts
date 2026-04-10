import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Re-export as `stripe` for convenience (lazy getter)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Plan credit amounts
export const PLAN_CREDITS: Record<string, number> = {
  FREE: 10,
  STARTER: 100,
  PRO: 300,
  UNLIMITED: 1000,
};

// Stripe price IDs from env
export const STRIPE_PRICES = {
  STARTER: process.env.STRIPE_PRICE_STARTER ?? "",
  PRO: process.env.STRIPE_PRICE_PRO ?? "",
  UNLIMITED: process.env.STRIPE_PRICE_UNLIMITED ?? "",
  PACK_25: process.env.STRIPE_PRICE_PACK_25 ?? "",
  PACK_100: process.env.STRIPE_PRICE_PACK_100 ?? "",
  PACK_350: process.env.STRIPE_PRICE_PACK_350 ?? "",
  PACK_800: process.env.STRIPE_PRICE_PACK_800 ?? "",
} as const;

export async function createCheckoutSession(
  userId: string,
  customerId: string,
  priceId: string,
  mode: "subscription" | "payment",
) {
  return getStripe().checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/workspace/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/workspace/billing?canceled=true`,
    metadata: { userId },
  });
}

export async function createBillingPortalSession(customerId: string) {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/workspace/billing`,
  });
}
