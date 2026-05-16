import { createFileRoute } from '@tanstack/react-router'
import { Webhooks } from "@polar-sh/tanstack-start";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// We instantiate this lazily or safely
const getConvexUrl = () => process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const convex = new ConvexHttpClient(getConvexUrl());

export const Route = createFileRoute("/api/webhook/polar")({
  server: {
    handlers: {
      POST: Webhooks({
        webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
        onPayload: async (payload) => {
          console.log("Received Polar webhook payload", payload.type);
        },
        onSubscriptionCreated: async (payload) => {
          const subscription = payload.data;
          // Use externalId first, then fallback to metadata.userId
          const userId = subscription.customer?.externalId || (subscription as any).customer?.external_id || subscription.customer?.metadata?.userId;
          const tier = subscription.product?.name?.toLowerCase().includes("premium") ? "premium" : "pro";
          
          if (userId) {
            try {
              await convex.mutation(api.users.updateSubscription, {
                userId: userId as any,
                subscriptionTier: tier,
                subscriptionExpiresAt: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : undefined,
                polarCustomerId: subscription.customerId || (subscription as any).customer_id,
                polarSubscriptionId: subscription.id,
              });
              console.log("Successfully updated subscription for user", userId);
            } catch (err) {
              console.error("Failed to update subscription in Convex:", err);
            }
          } else {
            console.warn("No userId found for subscription:", subscription.id);
          }
        },
        onSubscriptionUpdated: async (payload) => {
          const subscription = payload.data;
          const userId = subscription.customer?.externalId || (subscription as any).customer?.external_id || subscription.customer?.metadata?.userId;
          const tier = subscription.product?.name?.toLowerCase().includes("premium") ? "premium" : "pro";
          
          if (userId) {
            try {
              // If the subscription is active, trialing, OR if it's canceled but the period end is still in the future, keep them on their tier.
              const expiresAtMs = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : undefined;
              const isStillActive = subscription.status === "active" || subscription.status === "trialing" || (expiresAtMs && Date.now() < expiresAtMs);
              
              await convex.mutation(api.users.updateSubscription, {
                userId: userId as any,
                subscriptionTier: isStillActive ? tier : "free",
                subscriptionExpiresAt: expiresAtMs,
                polarCustomerId: subscription.customerId || (subscription as any).customer_id,
                polarSubscriptionId: subscription.id,
              });
              console.log("Successfully updated subscription for user", userId);
            } catch (err) {
              console.error("Failed to update subscription in Convex:", err);
            }
          } else {
            console.warn("No userId found for subscription:", subscription.id);
          }
        },
        onSubscriptionCanceled: async (payload) => {
          const subscription = payload.data;
          const userId = subscription.customer?.externalId || (subscription as any).customer?.external_id || subscription.customer?.metadata?.userId;
          const tier = subscription.product?.name?.toLowerCase().includes("premium") ? "premium" : "pro";
          
          if (userId) {
            try {
              // Even if canceled, if they have time left in the billing period, let them keep it.
              const expiresAtMs = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : undefined;
              const hasTimeLeft = expiresAtMs && Date.now() < expiresAtMs;

              await convex.mutation(api.users.updateSubscription, {
                userId: userId as any,
                subscriptionTier: hasTimeLeft ? tier : "free",
                subscriptionExpiresAt: hasTimeLeft ? expiresAtMs : undefined,
                polarCustomerId: subscription.customerId || (subscription as any).customer_id,
                polarSubscriptionId: subscription.id,
              });
              console.log("Successfully processed cancellation event for user", userId);
            } catch (err) {
              console.error("Failed to update subscription in Convex:", err);
            }
          } else {
            console.warn("No userId found for subscription:", subscription.id);
          }
        }
      }),
    },
  },
});
