import { mutation, query, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { internal } from './_generated/api';

export const submitTicket = mutation({
  args: {
    topic: v.union(
      v.literal('bug'),
      v.literal('feature'),
      v.literal('billing'),
      v.literal('general'),
      v.literal('other')
    ),
    message: v.string(),
    urlContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const ticketId = await ctx.db.insert('supportTickets', {
      userId,
      topic: args.topic,
      message: args.message,
      status: 'open',
      urlContext: args.urlContext,
    });

    const user = await ctx.db.get(userId);

    // Schedule email notification asynchronously
    await ctx.scheduler.runAfter(0, internal.support.sendSupportEmail, {
      ticketId,
      userName: user?.name || user?.email || 'משתמש לא ידוע',
      topic: args.topic,
      message: args.message,
    });

    return ticketId;
  },
});

export const sendSupportEmail = internalAction({
  args: {
    ticketId: v.id('supportTickets'),
    userName: v.string(),
    topic: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'support@buildsync.co.il';
    
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not set. Skipping email notification.');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'BuildSync Support <noreply@buildsync.co.il>',
          to: adminEmail,
          subject: `פניית תמיכה חדשה: ${args.topic} מ-${args.userName}`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif;">
              <h2>התקבלה פנייה חדשה במערכת!</h2>
              <p><strong>מאת:</strong> ${args.userName}</p>
              <p><strong>נושא:</strong> ${args.topic}</p>
              <p><strong>תוכן ההודעה:</strong></p>
              <div style="background: #f4f4f5; padding: 16px; border-radius: 8px;">
                ${args.message.replace(/\n/g, '<br>')}
              </div>
              <p style="margin-top: 24px;">תוכלו לנהל את הפנייה דרך עמוד הסופר אדמין באתר.</p>
            </div>
          `
        })
      });

      if (!response.ok) {
        console.error('Failed to send email:', await response.text());
      }
    } catch (e) {
      console.error('Error sending support email:', e);
    }
  }
});

export const getOpenTickets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const me = await ctx.db.get(userId);
    if (!me?.isSuperAdmin) throw new Error('Unauthorized: Not Super Admin');

    const tickets = await ctx.db
      .query('supportTickets')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .order('desc')
      .collect();

    // Attach user info
    return await Promise.all(
      tickets.map(async (t) => {
        const user = await ctx.db.get(t.userId);
        return {
          ...t,
          user: {
            name: user?.name || 'Unknown',
            email: user?.email || 'Unknown',
            phone: user?.phone || 'Unknown',
          },
        };
      })
    );
  },
});

export const resolveTicket = mutation({
  args: {
    ticketId: v.id('supportTickets'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const me = await ctx.db.get(userId);
    if (!me?.isSuperAdmin) throw new Error('Unauthorized: Not Super Admin');

    await ctx.db.patch(args.ticketId, {
      status: 'resolved',
      resolvedAt: Date.now(),
    });
  },
});

export const getOpenTicketCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const me = await ctx.db.get(userId);
    if (!me?.isSuperAdmin) return 0;

    const tickets = await ctx.db
      .query('supportTickets')
      .withIndex('by_status', (q) => q.eq('status', 'open'))
      .collect();

    return tickets.length;
  },
});
