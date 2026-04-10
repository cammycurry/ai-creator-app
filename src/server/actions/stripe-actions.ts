"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  stripe,
  createCheckoutSession,
  createBillingPortalSession,
  STRIPE_PRICES,
} from "@/lib/stripe";

async function getUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated");

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  return user;
}

async function getOrCreateStripeCustomer(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}) {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await db.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createSubscriptionCheckout(planKey: string) {
  const priceId = STRIPE_PRICES[planKey as keyof typeof STRIPE_PRICES];
  if (!priceId) throw new Error("Invalid plan");

  const user = await getUser();
  const customerId = await getOrCreateStripeCustomer(user);
  const session = await createCheckoutSession(
    user.id,
    customerId,
    priceId,
    "subscription",
  );
  return { url: session.url };
}

export async function createCreditPackCheckout(packKey: string) {
  const priceId = STRIPE_PRICES[packKey as keyof typeof STRIPE_PRICES];
  if (!priceId) throw new Error("Invalid pack");

  const user = await getUser();
  const customerId = await getOrCreateStripeCustomer(user);
  const session = await createCheckoutSession(
    user.id,
    customerId,
    priceId,
    "payment",
  );
  return { url: session.url };
}

export async function createPortalSession() {
  const user = await getUser();
  if (!user.stripeCustomerId) throw new Error("No Stripe customer");
  const session = await createBillingPortalSession(user.stripeCustomerId);
  return { url: session.url };
}

export async function getSubscriptionStatus() {
  const user = await getUser();
  return {
    plan: user.plan,
    planCredits: user.planCredits,
    packCredits: user.packCredits,
    totalCredits: user.planCredits + user.packCredits,
    hasSubscription: !!user.stripeSubscriptionId,
  };
}
