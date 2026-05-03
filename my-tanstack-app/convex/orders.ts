import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

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
      
    return await Promise.all(orders.map(async (order) => {
      const documentsWithUrls = await Promise.all(
        (order.deliveryDocuments || []).map(async (doc) => ({
          ...doc,
          url: await ctx.storage.getUrl(doc.storageId),
        }))
      );
      return { ...order, deliveryDocuments: documentsWithUrls };
    }));
  },
});

export const generateUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx) => {
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

export const remove = mutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

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

