import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { requireProjectFeature } from './_lib/projectAccess';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.role === 'contractor') {
      throw new Error("Contractors cannot access orders");
    }

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    // Batch all storageIds from all delivery documents in one pass
    const allStorageIds = new Set<string>();
    for (const order of orders) {
      for (const doc of order.deliveryDocuments ?? []) {
        allStorageIds.add(String(doc.storageId));
      }
    }
    const urlByStorageId = new Map<string, string | null>();
    await Promise.all(
      [...allStorageIds].map(async (storageId) => {
        urlByStorageId.set(storageId, await ctx.storage.getUrl(storageId as any));
      }),
    );

    return orders.map((order) => ({
      ...order,
      deliveryDocuments: (order.deliveryDocuments ?? []).map((doc) => ({
        ...doc,
        url: urlByStorageId.get(String(doc.storageId)) ?? null,
      })),
    }));

  },
});

export const generateUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectFeature(ctx, args.projectId, 'orders');
    return await ctx.storage.generateUploadUrl();
  },
});

export const addDocument = mutation({
  args: {
    orderId: v.id('orders'),
    storageId: v.id('_storage'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error('Order not found');
    await requireProjectFeature(ctx, order.projectId, 'orders');
    const documents = order.deliveryDocuments || [];
    documents.push({ storageId: args.storageId, name: args.name });
    await ctx.db.patch(args.orderId, { deliveryDocuments: documents });
  },
});

export const removeDocument = mutation({
  args: {
    orderId: v.id('orders'),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error('Order not found');
    await requireProjectFeature(ctx, order.projectId, 'orders');
    const documents = (order.deliveryDocuments || []).filter(d => d.storageId !== args.storageId);
    await ctx.db.patch(args.orderId, { deliveryDocuments: documents });
    await ctx.storage.delete(args.storageId);
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    supplier: v.optional(v.string()),
    orderedQuantity: v.number(),
    unit: v.string(),
    orderDate: v.optional(v.string()),
    expectedDeliveryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.role === 'contractor') {
      throw new Error("Contractors cannot create orders");
    }

    await requireProjectFeature(ctx, args.projectId, 'orders');

    return await ctx.db.insert('orders', {
      ...args,
      status: 'pending',
      receivedQuantity: 0,
      deliveryDocuments: [],
    });
  },
});

export const updateReceived = mutation({
  args: {
    orderId: v.id('orders'),
    receivedQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await requireProjectFeature(ctx, order.projectId, 'orders');

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.role === 'contractor') {
      throw new Error("Contractors cannot update orders");
    }

    let status: 'pending' | 'partial' | 'completed' = 'pending';
    if (args.receivedQuantity > 0) {
      if (args.receivedQuantity >= order.orderedQuantity) {
        status = 'completed';
      } else {
        status = 'partial';
      }
    }

    await ctx.db.patch(args.orderId, {
      receivedQuantity: args.receivedQuantity,
      status,
    });
  },
});

export const update = mutation({
  args: {
    orderId: v.id('orders'),
    title: v.optional(v.string()),
    supplier: v.optional(v.string()),
    orderedQuantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    orderDate: v.optional(v.string()),
    expectedDeliveryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, ...updates } = args;
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.role === 'contractor') {
      throw new Error("Contractors cannot update orders");
    }

    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    await requireProjectFeature(ctx, order.projectId, 'orders');

    await ctx.db.patch(orderId, updates);
  },
});

export const remove = mutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await requireProjectFeature(ctx, order.projectId, 'orders');

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    
    const user = await ctx.db.get(userId);
    if (user?.role === 'contractor') {
      throw new Error("Contractors cannot delete orders");
    }

    if (order.deliveryDocuments && order.deliveryDocuments.length > 0) {
      for (const doc of order.deliveryDocuments) {
        await ctx.storage.delete(doc.storageId);
      }
    }

    await ctx.db.delete(args.orderId);
  },
});

