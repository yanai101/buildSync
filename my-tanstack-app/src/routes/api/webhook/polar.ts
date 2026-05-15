import { createFileRoute } from '@tanstack/react-router'
import { Webhooks } from "@polar-sh/tanstack-start";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "");

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
          const userId = subscription.customer?.metadata?.userId || subscription.customerId;
          const tier = subscription.product?.name?.toLowerCase().includes("premium") ? "premium" : "pro";
          
          if (userId) {
            try {
              await convex.mutation(api.users.updateSubscription, {
                userId: userId as any,
                subscriptionTier: tier,
                subscriptionExpiresAt: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : undefined,
                polarCustomerId: subscription.customerId,
                polarSubscriptionId: subscription.id,
              });
              console.log("Successfully updated subscription for user", userId);
            } catch (err) {
              console.error("Failed to update subscription in Convex:", err);
            }
          }
        },
        onSubscriptionUpdated: async (payload) => {
          const subscription = payload.data;
          const userId = subscription.customer?.metadata?.userId || subscription.customerId;
          const tier = subscription.product?.name?.toLowerCase().includes("premium") ? "premium" : "pro";
          
          if (userId) {
            try {
              await convex.mutation(api.users.updateSubscription, {
                userId: userId as any,
                subscriptionTier: subscription.status === "active" || subscription.status === "trialing" ? tier : "free",
                subscriptionExpiresAt: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : undefined,
                polarCustomerId: subscription.customerId,
                polarSubscriptionId: subscription.id,
              });
              console.log("Successfully updated subscription for user", userId);
            } catch (err) {
              console.error("Failed to update subscription in Convex:", err);
            }
          }
        },
        onSubscriptionCanceled: async (payload) => {
          const subscription = payload.data;
          const userId = subscription.customer?.metadata?.userId || subscription.customerId;
          
          if (userId) {
            try {
              await convex.mutation(api.users.updateSubscription, {
                userId: userId as any,
                subscriptionTier: "free",
                subscriptionExpiresAt: undefined,
                polarCustomerId: subscription.customerId,
                polarSubscriptionId: subscription.id,
              });
              console.log("Successfully canceled subscription for user", userId);
            } catch (err) {
              console.error("Failed to update subscription in Convex:", err);
            }
          }
        }
      }),
    },
  },
});
