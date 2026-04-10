import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, PLAN_CREDITS } from "@/lib/stripe";
import { db } from "@/lib/db";
import type { Plan } from "@/generated/prisma/client";

async function getUserByStripeCustomerId(customerId: string) {
  return db.user.findUnique({
    where: { stripeCustomerId: customerId },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  if (session.mode === "subscription") {
    const subscription = await getStripe().subscriptions.retrieve(
      session.subscription as string,
    );
    const priceId = subscription.items.data[0]?.price.id;

    // Determine plan from price
    const plan = getPlanFromPriceId(priceId);

    await db.user.update({
      where: { id: userId },
      data: {
        plan,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        planCredits: PLAN_CREDITS[plan] ?? 10,
      },
    });

    await db.creditTransaction.create({
      data: {
        userId,
        type: "PLAN_GRANT",
        amount: PLAN_CREDITS[plan] ?? 10,
        balance: PLAN_CREDITS[plan] ?? 10,
        description: `Subscribed to ${plan} plan`,
      },
    });
  } else if (session.mode === "payment") {
    // One-time credit pack purchase
    const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
    const item = lineItems.data[0];
    if (!item?.price?.id) return;

    const product = await getStripe().products.retrieve(
      item.price.product as string,
    );
    const credits = parseInt(product.metadata.credits || "0", 10);
    if (credits <= 0) return;

    const user = await db.user.update({
      where: { id: userId },
      data: { packCredits: { increment: credits } },
      select: { planCredits: true, packCredits: true },
    });

    await db.creditTransaction.create({
      data: {
        userId,
        type: "PURCHASE",
        amount: credits,
        balance: user.planCredits + user.packCredits,
        description: `Credit pack purchased: ${credits} credits`,
        stripePaymentId: session.payment_intent as string,
      },
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await getUserByStripeCustomerId(
    subscription.customer as string,
  );
  if (!user) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  await db.user.update({
    where: { id: user.id },
    data: {
      plan,
      stripeSubscriptionId: subscription.id,
      planCredits: PLAN_CREDITS[plan] ?? 10,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await getUserByStripeCustomerId(
    subscription.customer as string,
  );
  if (!user) return;

  // Revert to FREE, keep existing credits
  await db.user.update({
    where: { id: user.id },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Only handle subscription invoices
  if (invoice.parent?.type !== "subscription_details") return;

  const user = await getUserByStripeCustomerId(invoice.customer as string);
  if (!user) return;

  // Reset plan credits on renewal
  const credits = PLAN_CREDITS[user.plan] ?? 10;
  await db.user.update({
    where: { id: user.id },
    data: { planCredits: credits },
  });

  await db.creditTransaction.create({
    data: {
      userId: user.id,
      type: "PLAN_GRANT",
      amount: credits,
      balance: credits + user.packCredits,
      description: `Monthly renewal: ${credits} plan credits`,
    },
  });
}

function getPlanFromPriceId(priceId: string | undefined): Plan {
  if (!priceId) return "FREE";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  if (priceId === process.env.STRIPE_PRICE_UNLIMITED) return "UNLIMITED";
  return "FREE";
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook error for ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
