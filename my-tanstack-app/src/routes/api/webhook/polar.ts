import { createFileRoute } from '@tanstack/react-router'
import { Webhooks } from "@polar-sh/tanstack-start";
import { Polar } from "@polar-sh/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// We instantiate this lazily or safely
const getConvexUrl = () => process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const convex = new ConvexHttpClient(getConvexUrl());

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
});

// Billing cadence of the subscription ('month' | 'year'), so plan switches
// between monthly and yearly are visible in the app even though the tier
// stays the same.
const getInterval = (subscription: any): "month" | "year" | undefined => {
  const raw =
    subscription.recurringInterval ??
    subscription.recurring_interval ??
    subscription.product?.recurringInterval ??
    subscription.product?.recurring_interval;
  return raw === "month" || raw === "year" ? raw : undefined;
};

const tierForProduct = (productName?: string | null): "pro" | "premium" =>
  productName?.toLowerCase().includes("premium") ? "premium" : "pro";

// Statuses that still entitle the customer to the product. Scheduled
// cancellations stay "active" (with cancelAtPeriodEnd) until the period ends,
// so they are covered here too.
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Syncs the user's subscription state in Convex from the Polar API rather
 * than from the individual webhook payload. A plan switch (e.g. yearly →
 * monthly) makes Polar cancel one subscription and create another, producing
 * multiple events in no guaranteed order — replaying any single event can
 * overwrite newer state with stale data. Re-fetching the customer's current
 * subscriptions makes every event handler idempotent and order-proof.
 */
const syncSubscriptionState = async (subscription: any) => {
  const userId =
    subscription.customer?.externalId ||
    subscription.customer?.external_id ||
    subscription.customer?.metadata?.userId;
  const customerId = subscription.customerId || subscription.customer_id;

  if (!userId) {
    // Plan switches leave behind canceled subscriptions whose customer copy
    // has no externalId — the event for the replacement subscription carries
    // it and performs the sync, so skipping here is safe.
    console.warn("No userId found for subscription:", subscription.id);
    return;
  }

  try {
    const listed = customerId
      ? await polar.subscriptions.list({ customerId, limit: 50 })
      : null;
    const items = listed?.result?.items ?? [subscription];

    const byNewestStart = (a: any, b: any) =>
      new Date(b.currentPeriodStart ?? 0).getTime() - new Date(a.currentPeriodStart ?? 0).getTime();
    const current = items.filter((s: any) => LIVE_STATUSES.has(s.status)).sort(byNewestStart)[0];

    if (current) {
      const expiresAtMs = current.currentPeriodEnd ? new Date(current.currentPeriodEnd).getTime() : undefined;
      await convex.mutation(api.users.updateSubscription, {
        secret: process.env.SUBSCRIPTION_SYNC_SECRET!,
        userId: userId as any,
        subscriptionTier: tierForProduct(current.product?.name),
        subscriptionExpiresAt: expiresAtMs,
        subscriptionInterval: getInterval(current),
        subscriptionAutoRenew: !current.cancelAtPeriodEnd,
        polarCustomerId: customerId,
        polarSubscriptionId: current.id,
      });
      console.log("Synced subscription state for user", userId, "->", current.id, current.status);
      return;
    }

    // No live subscription. Honor remaining paid time only when the latest
    // subscription actually ran to its period end (endedAt marks the real
    // cutoff for immediate revocations).
    const latest = items.sort(byNewestStart)[0];
    const endedAtMs = latest?.endedAt ? new Date(latest.endedAt).getTime() : undefined;
    const periodEndMs = latest?.currentPeriodEnd ? new Date(latest.currentPeriodEnd).getTime() : undefined;
    const cutoffMs = endedAtMs ?? periodEndMs;
    const hasTimeLeft = !!cutoffMs && Date.now() < cutoffMs;

    await convex.mutation(api.users.updateSubscription, {
      secret: process.env.SUBSCRIPTION_SYNC_SECRET!,
      userId: userId as any,
      subscriptionTier: hasTimeLeft ? tierForProduct(latest?.product?.name) : "free",
      subscriptionExpiresAt: hasTimeLeft ? cutoffMs : undefined,
      subscriptionInterval: hasTimeLeft ? getInterval(latest) : undefined,
      subscriptionAutoRenew: hasTimeLeft ? false : undefined,
      polarCustomerId: customerId,
      polarSubscriptionId: latest?.id,
    });
    console.log("Synced subscription state for user", userId, "-> no live subscription");
  } catch (err) {
    // Rethrow so the webhook responds non-2xx and Polar retries the delivery —
    // a swallowed transient failure would leave the user stale until the next
    // unrelated event.
    console.error("Failed to sync subscription state in Convex:", err);
    throw err;
  }
};

export const Route = createFileRoute("/api/webhook/polar")({
  server: {
    handlers: {
      POST: Webhooks({
        webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
        onPayload: async (payload) => {
          console.log("Received Polar webhook payload", payload.type);
        },
        onSubscriptionCreated: async (payload) => {
          await syncSubscriptionState(payload.data);
        },
        onSubscriptionUpdated: async (payload) => {
          await syncSubscriptionState(payload.data);
        },
        onSubscriptionCanceled: async (payload) => {
          await syncSubscriptionState(payload.data);
        },
      }),
    },
  },
});
