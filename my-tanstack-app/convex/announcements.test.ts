/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, test, expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

describe('announcements system', () => {
  test('unauthorized access to admin functions', async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run((ctx) => ctx.db.insert('users', { name: 'Normal User', isSuperAdmin: false }));
    const asUser = t.withIdentity({ subject: userId });

    await expect(asUser.query(api.announcements.getAllAnnouncements)).rejects.toThrow('Unauthorized');
    
    await expect(asUser.mutation(api.announcements.createAnnouncement, {
      title: 'Test', body: 'Test', type: 'info', audienceType: 'all', status: 'published', publishAt: Date.now()
    })).rejects.toThrow('Unauthorized');
  });

  test('admin can create and manage announcements', async () => {
    const t = convexTest(schema, modules);
    const adminId = await t.run((ctx) => ctx.db.insert('users', { name: 'Admin', isSuperAdmin: true }));
    const asAdmin = t.withIdentity({ subject: adminId });

    const annId = await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'New Feature',
      body: 'Check it out',
      type: 'feature',
      audienceType: 'all',
      status: 'draft',
      publishAt: Date.now()
    });

    let allAnns = await asAdmin.query(api.announcements.getAllAnnouncements);
    expect(allAnns).toHaveLength(1);
    expect(allAnns[0].title).toBe('New Feature');
    expect(allAnns[0].status).toBe('draft');

    await asAdmin.mutation(api.announcements.updateAnnouncement, {
      id: annId,
      title: 'Updated Feature',
    });

    await asAdmin.mutation(api.announcements.setAnnouncementStatus, {
      id: annId,
      status: 'published'
    });

    allAnns = await asAdmin.query(api.announcements.getAllAnnouncements);
    expect(allAnns[0].title).toBe('Updated Feature');
    expect(allAnns[0].status).toBe('published');

    await asAdmin.mutation(api.announcements.deleteAnnouncement, { id: annId });
    allAnns = await asAdmin.query(api.announcements.getAllAnnouncements);
    expect(allAnns).toHaveLength(0);
  });

  test('getActiveAnnouncements filters by status, publishAt, expiresAt and audience', async () => {
    const t = convexTest(schema, modules);
    
    const adminId = await t.run((ctx) => ctx.db.insert('users', { name: 'Admin', isSuperAdmin: true }));
    const asAdmin = t.withIdentity({ subject: adminId });
    
    const freeUserId = await t.run((ctx) => ctx.db.insert('users', { name: 'Free', subscriptionTier: 'free' }));
    const asFreeUser = t.withIdentity({ subject: freeUserId });
    
    const proUserId = await t.run((ctx) => ctx.db.insert('users', { name: 'Pro', subscriptionTier: 'pro' }));
    const asProUser = t.withIdentity({ subject: proUserId });

    const now = Date.now();

    // 1. Draft (should not be visible)
    await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'Draft', body: 'x', type: 'info', audienceType: 'all', status: 'draft', publishAt: now - 1000
    });

    // 2. Future (should not be visible)
    await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'Future', body: 'x', type: 'info', audienceType: 'all', status: 'published', publishAt: now + 100000
    });

    // 3. Expired (should not be visible)
    await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'Expired', body: 'x', type: 'info', audienceType: 'all', status: 'published', publishAt: now - 10000, expiresAt: now - 1000
    });

    // 4. Valid All Audience
    await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'All', body: 'x', type: 'info', audienceType: 'all', status: 'published', publishAt: now - 1000
    });

    // 5. Valid Pro Audience
    await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'ProOnly', body: 'x', type: 'info', audienceType: 'plan', plans: ['pro'], status: 'published', publishAt: now - 1000
    });

    // 6. Valid Specific User Audience
    await asAdmin.mutation(api.announcements.createAnnouncement, {
      title: 'FreeOnly', body: 'x', type: 'info', audienceType: 'users', userIds: [freeUserId], status: 'published', publishAt: now - 1000
    });

    // Test as Free User
    const freeActive = await asFreeUser.query(api.announcements.getActiveAnnouncements);
    expect(freeActive).toHaveLength(2);
    expect(freeActive.map(a => a.title).sort()).toEqual(['All', 'FreeOnly'].sort());

    // Test as Pro User
    const proActive = await asProUser.query(api.announcements.getActiveAnnouncements);
    expect(proActive).toHaveLength(2);
    expect(proActive.map(a => a.title).sort()).toEqual(['All', 'ProOnly'].sort());
    
    // Test anonymous user
    const anonActive = await t.query(api.announcements.getActiveAnnouncements);
    expect(anonActive).toHaveLength(0);
  });
});
