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

  // Create a project owned by the free user
  const freeProject = await t.run((ctx) => ctx.db.insert('projects', {
    name: 'Free Project',
    ownerUserId: freeUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // Create a project owned by the pro user
  const proProject = await t.run((ctx) => ctx.db.insert('projects', {
    name: 'Pro Project',
    ownerUserId: proUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  return { t, freeUserId, proUserId, freeProject, proProject };
}

describe('Quick Notes', () => {
  test('creates a note and lists it', async () => {
    const { t, freeUserId, freeProject } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    const noteId = await asFreeUser.mutation(api.quickNotes.create, {
      projectId: freeProject,
      text: 'פתק ראשון שלי',
      color: '#FEF08A'
    });

    expect(noteId).toBeDefined();

    const notes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(notes.length).toBe(1);
    expect(notes[0].text).toBe('פתק ראשון שלי');
    expect(notes[0].color).toBe('#FEF08A');
  });

  test('enforces 5 notes limit based on project owner (free user)', async () => {
    const { t, freeUserId, freeProject } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    // Create 5 notes
    for (let i = 0; i < 5; i++) {
      await asFreeUser.mutation(api.quickNotes.create, { projectId: freeProject, text: `Note ${i}` });
    }

    const notes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(notes.length).toBe(5);

    // Try to create 6th note
    await expect(asFreeUser.mutation(api.quickNotes.create, { projectId: freeProject, text: 'Note 6' }))
      .rejects.toThrowError(/FREE_NOTE_LIMIT|הגעת למגבלת הפתקים בפרויקט זה/);
  });

  test('allows unlimited notes if project owner is pro', async () => {
    const { t, freeUserId, proProject } = await setup();
    
    // Even if I am a free user, since the project is owned by a pro user, I get unlimited notes!
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    // Create 6 notes (bypasses free tier limit)
    for (let i = 0; i < 6; i++) {
      await asFreeUser.mutation(api.quickNotes.create, { projectId: proProject, text: `Pro Note ${i}` });
    }

    const notes = await asFreeUser.query(api.quickNotes.list, { projectId: proProject });
    expect(notes.length).toBe(6);
  });

  test('notes are scoped to the project', async () => {
    const { t, freeUserId, freeProject, proProject } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    await asFreeUser.mutation(api.quickNotes.create, { projectId: freeProject, text: 'Free note' });
    await asFreeUser.mutation(api.quickNotes.create, { projectId: proProject, text: 'Pro note' });

    const freeNotes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(freeNotes.length).toBe(1);
    expect(freeNotes[0].text).toBe('Free note');

    const proNotes = await asFreeUser.query(api.quickNotes.list, { projectId: proProject });
    expect(proNotes.length).toBe(1);
    expect(proNotes[0].text).toBe('Pro note');
  });

  test('can remove a note', async () => {
    const { t, freeUserId, freeProject } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });

    const noteId = await asFreeUser.mutation(api.quickNotes.create, { projectId: freeProject, text: 'פתק למחיקה' });
    
    let notes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(notes.length).toBe(1);

    await asFreeUser.mutation(api.quickNotes.remove, { noteId });

    notes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(notes.length).toBe(0);
  });
});
