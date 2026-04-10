"use client";

import { useEffect, useState } from "react";
import {
  createSubscriptionCheckout,
  createCreditPackCheckout,
  createPortalSession,
  getSubscriptionStatus,
} from "@/server/actions/stripe-actions";

type PlanInfo = {
  plan: string;
  planCredits: number;
  packCredits: number;
  totalCredits: number;
  hasSubscription: boolean;
};

const PLANS = [
  { name: "Free", key: "FREE", price: "$0", credits: 10, creators: "Pre-made only", stripePriceKey: null },
  { name: "Starter", key: "STARTER", price: "$19/mo", credits: 100, creators: "3 creators", stripePriceKey: "STARTER" },
  { name: "Pro", key: "PRO", price: "$49/mo", credits: 300, creators: "10 creators", stripePriceKey: "PRO" },
  { name: "Unlimited", key: "UNLIMITED", price: "$99/mo", credits: 1000, creators: "Unlimited", stripePriceKey: "UNLIMITED" },
];

const PACKS = [
  { credits: 25, price: "$5", key: "PACK_25" },
  { credits: 100, price: "$15", key: "PACK_100" },
  { credits: 350, price: "$40", key: "PACK_350" },
  { credits: 800, price: "$80", key: "PACK_800" },
];

export default function BillingPage() {
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionStatus().then(setInfo).catch(console.error);
  }, []);

  async function handlePlanClick(planKey: string) {
    setLoading(planKey);
    try {
      const { url } = await createSubscriptionCheckout(planKey);
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handlePackClick(packKey: string) {
    setLoading(packKey);
    try {
      const { url } = await createCreditPackCheckout(packKey);
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("portal");
    try {
      const { url } = await createPortalSession();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="billing-page">
      {/* Current Plan */}
      <div className="billing-section">
        <h2 className="billing-heading">Your Plan</h2>
        {info ? (
          <div className="billing-current">
            <div className="billing-plan-badge">{info.plan}</div>
            <div className="billing-credits-info">
              <span className="billing-credits-number">{info.totalCredits}</span>
              <span className="billing-credits-label">credits remaining</span>
            </div>
            <div className="billing-credits-breakdown">
              {info.planCredits} plan + {info.packCredits} purchased
            </div>
            {info.hasSubscription && (
              <button
                className="billing-manage-btn"
                onClick={handleManage}
                disabled={loading === "portal"}
              >
                {loading === "portal" ? "Loading..." : "Manage Subscription"}
              </button>
            )}
          </div>
        ) : (
          <div className="billing-current">
            <div className="billing-credits-label">Loading...</div>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="billing-section">
        <h2 className="billing-heading">Plans</h2>
        <div className="billing-plans-grid">
          {PLANS.map((plan) => {
            const isCurrent = info?.plan === plan.key;
            return (
              <div
                key={plan.key}
                className={`billing-plan-card ${isCurrent ? "current" : ""}`}
              >
                <div className="billing-plan-name">{plan.name}</div>
                <div className="billing-plan-price">{plan.price}</div>
                <div className="billing-plan-detail">{plan.credits} credits/mo</div>
                <div className="billing-plan-detail">{plan.creators}</div>
                {isCurrent ? (
                  <div className="billing-plan-current-label">Current Plan</div>
                ) : plan.stripePriceKey ? (
                  <button
                    className="billing-plan-btn"
                    onClick={() => handlePlanClick(plan.stripePriceKey!)}
                    disabled={loading === plan.stripePriceKey}
                  >
                    {loading === plan.stripePriceKey ? "Loading..." : "Subscribe"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Packs */}
      <div className="billing-section">
        <h2 className="billing-heading">Buy Credits</h2>
        <div className="billing-packs-grid">
          {PACKS.map((pack) => (
            <button
              key={pack.key}
              className="billing-pack-card"
              onClick={() => handlePackClick(pack.key)}
              disabled={loading === pack.key}
            >
              <div className="billing-pack-credits">{pack.credits}</div>
              <div className="billing-pack-label">credits</div>
              <div className="billing-pack-price">{pack.price}</div>
              {loading === pack.key && (
                <div className="billing-pack-loading">Loading...</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
