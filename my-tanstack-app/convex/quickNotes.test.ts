/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

async function setup() {
  const t = convexTest(schema, modules);
  
  const freeUserId = await t.run((ctx) => ctx.db.insert('users', {
    name: 'משתמש חינמי',
    subscriptionTier: 'free',
  }));

  const proUserId = await t.run((ctx) => ctx.db.insert('users', {
    name: 'משתמש פרו',
    subscriptionTier: 'pro',
    subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }));

  return { t, freeUserId, proUserId };
}

describe('Quick Notes', () => {
  test('creates a note and lists it', async () => {
    const { t, freeUserId } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    const noteId = await asFreeUser.mutation(api.quickNotes.create, {
      text: 'פתק ראשון שלי',
      color: '#FEF08A'
    });

    expect(noteId).toBeDefined();

    const notes = await asFreeUser.query(api.quickNotes.list, {});
    expect(notes.length).toBe(1);
    expect(notes[0].text).toBe('פתק ראשון שלי');
    expect(notes[0].color).toBe('#FEF08A');
  });

  test('enforces 5 notes limit for free users', async () => {
    const { t, freeUserId } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    // Create 5 notes
    for (let i = 0; i < 5; i++) {
      await asFreeUser.mutation(api.quickNotes.create, { text: `Note ${i}` });
    }

    const notes = await asFreeUser.query(api.quickNotes.list, {});
    expect(notes.length).toBe(5);

    // Try to create 6th note
    await expect(asFreeUser.mutation(api.quickNotes.create, { text: 'Note 6' }))
      .rejects.toThrowError(/FREE_NOTE_LIMIT|משתמשי חינם יכולים לשמור עד 5 פתקים/);
  });

  test('allows unlimited notes for pro users', async () => {
    const { t, proUserId } = await setup();
    const asProUser = t.withIdentity({ subject: proUserId });

    // Create 6 notes (bypasses free tier limit)
    for (let i = 0; i < 6; i++) {
      await asProUser.mutation(api.quickNotes.create, { text: `Pro Note ${i}` });
    }

    const notes = await asProUser.query(api.quickNotes.list, {});
    expect(notes.length).toBe(6);
  });

  test('users only see their own notes', async () => {
    const { t, freeUserId, proUserId } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });
    const asProUser = t.withIdentity({ subject: proUserId });

    await asFreeUser.mutation(api.quickNotes.create, { text: 'Free note' });
    await asProUser.mutation(api.quickNotes.create, { text: 'Pro note' });

    const freeNotes = await asFreeUser.query(api.quickNotes.list, {});
    expect(freeNotes.length).toBe(1);
    expect(freeNotes[0].text).toBe('Free note');

    const proNotes = await asProUser.query(api.quickNotes.list, {});
    expect(proNotes.length).toBe(1);
    expect(proNotes[0].text).toBe('Pro note');
  });

  test('can remove a note', async () => {
    const { t, freeUserId } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    const noteId = await asFreeUser.mutation(api.quickNotes.create, { text: 'פתק למחיקה' });
    
    let notes = await asFreeUser.query(api.quickNotes.list, {});
    expect(notes.length).toBe(1);

    await asFreeUser.mutation(api.quickNotes.remove, { noteId });

    notes = await asFreeUser.query(api.quickNotes.list, {});
    expect(notes.length).toBe(0);
  });
});
