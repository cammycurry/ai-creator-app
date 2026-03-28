"use server";

import { db } from "@/lib/db";
import type { CreditBalance } from "@/types/credits";

/**
 * Get the current credit balance for a user.
 */
export async function checkBalance(userId: string): Promise<CreditBalance> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { planCredits: true, packCredits: true },
  });

  return {
    planCredits: user.planCredits,
    packCredits: user.packCredits,
    total: user.planCredits + user.packCredits,
  };
}

/**
 * Deduct credits from a user's balance.
 * Pack credits are consumed first, then plan credits.
 * Creates a CreditTransaction with type SPEND.
 * Throws if the user has insufficient credits.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  contentId?: string,
): Promise<CreditBalance> {
  if (amount <= 0) {
    throw new Error("Deduction amount must be positive");
  }

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { planCredits: true, packCredits: true },
    });

    const totalAvailable = user.planCredits + user.packCredits;

    if (totalAvailable < amount) {
      throw new Error(
        `Insufficient credits. Required: ${amount}, available: ${totalAvailable}`,
      );
    }

    // Deduct from packCredits first, then planCredits
    let remaining = amount;
    let newPackCredits = user.packCredits;
    let newPlanCredits = user.planCredits;

    if (newPackCredits >= remaining) {
      newPackCredits -= remaining;
      remaining = 0;
    } else {
      remaining -= newPackCredits;
      newPackCredits = 0;
      newPlanCredits -= remaining;
      remaining = 0;
    }

    const newTotal = newPlanCredits + newPackCredits;

    // Update user credits
    await tx.user.update({
      where: { id: userId },
      data: {
        planCredits: newPlanCredits,
        packCredits: newPackCredits,
      },
    });

    // Record the transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        type: "SPEND",
        amount: -amount,
        balance: newTotal,
        description: reason,
        contentId: contentId ?? null,
      },
    });

    return {
      planCredits: newPlanCredits,
      packCredits: newPackCredits,
      total: newTotal,
    };
  });

  return result;
}

/**
 * Refund credits back to a user's planCredits balance.
 * Creates a CreditTransaction with type REFUND.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  contentId?: string,
): Promise<CreditBalance> {
  if (amount <= 0) {
    throw new Error("Refund amount must be positive");
  }

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        planCredits: { increment: amount },
      },
      select: { planCredits: true, packCredits: true },
    });

    const newTotal = user.planCredits + user.packCredits;

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "REFUND",
        amount,
        balance: newTotal,
        description: reason,
        contentId: contentId ?? null,
      },
    });

    return {
      planCredits: user.planCredits,
      packCredits: user.packCredits,
      total: newTotal,
    };
  });

  return result;
}

/**
 * Reset a user's planCredits to the given amount (used on subscription renewal).
 * Creates a CreditTransaction with type PLAN_GRANT.
 */
export async function grantPlanCredits(
  userId: string,
  amount: number,
): Promise<CreditBalance> {
  if (amount < 0) {
    throw new Error("Grant amount must not be negative");
  }

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        planCredits: amount,
      },
      select: { planCredits: true, packCredits: true },
    });

    const newTotal = user.planCredits + user.packCredits;

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "PLAN_GRANT",
        amount,
        balance: newTotal,
        description: `Plan credits granted: ${amount}`,
      },
    });

    return {
      planCredits: user.planCredits,
      packCredits: user.packCredits,
      total: newTotal,
    };
  });

  return result;
}

/**
 * Add credits to a user's packCredits balance (used for credit pack purchases).
 * Creates a CreditTransaction with type PURCHASE.
 */
export async function grantPackCredits(
  userId: string,
  amount: number,
): Promise<CreditBalance> {
  if (amount <= 0) {
    throw new Error("Pack credit amount must be positive");
  }

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        packCredits: { increment: amount },
      },
      select: { planCredits: true, packCredits: true },
    });

    const newTotal = user.planCredits + user.packCredits;

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "PURCHASE",
        amount,
        balance: newTotal,
        description: `Credit pack purchased: ${amount} credits`,
      },
    });

    return {
      planCredits: user.planCredits,
      packCredits: user.packCredits,
      total: newTotal,
    };
  });

  return result;
}
