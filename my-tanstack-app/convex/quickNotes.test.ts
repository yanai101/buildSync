/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import { makeProject } from './_test/factories';

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
  const freeProject = await t.run((ctx) => ctx.db.insert(
    'projects',
    makeProject(freeUserId, { name: 'Free Project' }),
  ));

  // Create a project owned by the pro user
  const proProject = await t.run((ctx) => ctx.db.insert(
    'projects',
    makeProject(proUserId, { name: 'Pro Project' }),
  ));

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

  test('can share a note with a team member and they can remove it from their board', async () => {
    const { t, freeUserId, proUserId, freeProject } = await setup();
    const asFreeUser = t.withIdentity({ subject: freeUserId });
    const asProUser = t.withIdentity({ subject: proUserId });

    const noteId = await asFreeUser.mutation(api.quickNotes.create, { projectId: freeProject, text: 'Shared Note' });
    
    // Pro user shouldn't see it initially
    let proNotes = await asProUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(proNotes.length).toBe(0);

    // Free user shares it with Pro user
    await asFreeUser.mutation(api.quickNotes.share, { noteId, userId: proUserId });

    // Pro user should now see it
    proNotes = await asProUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(proNotes.length).toBe(1);
    expect(proNotes[0].text).toBe('Shared Note');

    // Free user still sees it
    let freeNotes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(freeNotes.length).toBe(1);

    // Pro user removes it from their board (only removes them from sharedWith)
    await asProUser.mutation(api.quickNotes.remove, { noteId });

    // Pro user shouldn't see it anymore
    proNotes = await asProUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(proNotes.length).toBe(0);

    // Free user should STILL see it (they are the creator)
    freeNotes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(freeNotes.length).toBe(1);

    // Free user deletes it completely
    await asFreeUser.mutation(api.quickNotes.remove, { noteId });
    freeNotes = await asFreeUser.query(api.quickNotes.list, { projectId: freeProject });
    expect(freeNotes.length).toBe(0);
  });

  test('inspector shares a note with project owner and owner sees it with author details', async () => {
    const { t, proUserId: ownerId, proProject } = await setup();
    const inspectorId = await t.run((ctx) => ctx.db.insert('users', {
      name: 'רון לוי',
      role: 'inspector',
    }));
    await t.run((ctx) => ctx.db.patch(proProject, {
      inspectorUserId: inspectorId,
      inspectorName: 'רון לוי',
    }));

    const asInspector = t.withIdentity({ subject: inspectorId });
    const asOwner = t.withIdentity({ subject: ownerId });

    // Inspector checks team list for sharing and sees owner
    const team = await asInspector.query(api.quickNotes.listTeamForSharing, { projectId: proProject });
    expect(team.some((m: any) => m._id === ownerId)).toBe(true);

    // Inspector creates a note shared directly with owner
    await asInspector.mutation(api.quickNotes.create, {
      projectId: proProject,
      text: 'פתק מהמפקח לבעל הבית',
      sharedWith: [ownerId],
    });

    const ownerNotes = await asOwner.query(api.quickNotes.list, { projectId: proProject });
    expect(ownerNotes.length).toBe(1);
    expect(ownerNotes[0].text).toBe('פתק מהמפקח לבעל הבית');
    expect(ownerNotes[0].authorName).toBe('רון לוי');
    expect(ownerNotes[0].authorRole).toBe('מפקח');
  });

  test('lists notes from newest to oldest, including newly shared notes at the top', async () => {
    const { t, proUserId: ownerId, freeUserId: inspectorId, proProject } = await setup();
    const asOwner = t.withIdentity({ subject: ownerId });
    const asInspector = t.withIdentity({ subject: inspectorId });

    // Inspector creates an older note (not shared yet)
    const olderInspectorNoteId = await asInspector.mutation(api.quickNotes.create, {
      projectId: proProject,
      text: 'פתק ישן של המפקח ששותף עכשיו',
    });

    // Owner creates 3 notes sequentially
    await asOwner.mutation(api.quickNotes.create, { projectId: proProject, text: 'פתק 1 (ראשון שנוסף)' });
    await asOwner.mutation(api.quickNotes.create, { projectId: proProject, text: 'פתק 2 (אמצעי)' });
    await asOwner.mutation(api.quickNotes.create, { projectId: proProject, text: 'פתק 3 (אחרון שנוסף)' });

    let ownerNotes = await asOwner.query(api.quickNotes.list, { projectId: proProject });
    expect(ownerNotes.map((n: any) => n.text)).toEqual([
      'פתק 3 (אחרון שנוסף)',
      'פתק 2 (אמצעי)',
      'פתק 1 (ראשון שנוסף)',
    ]);

    // Now inspector shares the older note with the owner -> it should appear at the top!
    await new Promise((r) => setTimeout(r, 10));
    await asInspector.mutation(api.quickNotes.share, {
      noteId: olderInspectorNoteId,
      userId: ownerId,
    });

    ownerNotes = await asOwner.query(api.quickNotes.list, { projectId: proProject });
    expect(ownerNotes.map((n: any) => n.text)).toEqual([
      'פתק ישן של המפקח ששותף עכשיו',
      'פתק 3 (אחרון שנוסף)',
      'פתק 2 (אמצעי)',
      'פתק 1 (ראשון שנוסף)',
    ]);
  });
});
