import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireProjectFileUser } from './_lib/projectAccess';

const photoTagValidator = v.union(
  v.literal('התקדמות'),
  v.literal('בעיה'),
  v.literal('בדיקה'),
  v.literal('אישור'),
);

const photoAnnotationValidator = v.object({
  type: v.union(v.literal('rect'), v.literal('circle'), v.literal('pen')),
  x: v.number(),
  y: v.number(),
  w: v.optional(v.number()),
  h: v.optional(v.number()),
  r: v.optional(v.number()),
  points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
  color: v.string(),
  text: v.optional(v.string()),
});

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectFileUser(ctx, args.projectId);
    return await ctx.db
      .query('photos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);
  },
});

export const createFromProjectFile = mutation({
  args: {
    projectId: v.id('projects'),
    projectFileId: v.id('projectFiles'),
    label: v.string(),
    location: v.string(),
    stageLabel: v.optional(v.string()),
    tag: v.optional(photoTagValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectFileUser(ctx, args.projectId);
    const projectFile = await ctx.db.get(args.projectFileId);
    if (!projectFile || projectFile.projectId !== args.projectId) {
      throw new Error('Project file not found');
    }
    if (projectFile.usage !== 'photo' || projectFile.kind !== 'image') {
      throw new Error('Project file is not a photo');
    }

    const now = new Date().toISOString().slice(0, 10);
    return await ctx.db.insert('photos', {
      projectId: args.projectId,
      projectFileId: args.projectFileId,
      takenOn: now,
      location: args.location.trim() || 'לא הוגדר',
      tag: args.tag ?? 'התקדמות',
      label: args.label.trim() || projectFile.originalName,
      ...(args.stageLabel ? { stageLabel: args.stageLabel } : {}),
      uploaderUserId: userId,
    });
  },
});

export const getDetails = query({
  args: {
    photoId: v.id('photos'),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      return null;
    }
    await requireProjectFileUser(ctx, photo.projectId);

    const versions = await ctx.db
      .query('photoFileVersions')
      .withIndex('by_photo_versionNumber', (q) => q.eq('photoId', args.photoId))
      .order('desc')
      .take(25);

    const notes = await ctx.db
      .query('photoNotes')
      .withIndex('by_photo', (q) => q.eq('photoId', args.photoId))
      .order('desc')
      .take(100);

    const annotations = await ctx.db
      .query('photoAnnotations')
      .withIndex('by_photo', (q) => q.eq('photoId', args.photoId))
      .take(200);

    const versionsWithUrls = await Promise.all(versions.map(async (version) => {
      const file = await ctx.db.get(version.annotatedProjectFileId);
      return {
        ...version,
        id: version._id,
        fileUrl: file ? await ctx.storage.getUrl(file.storageId) : null,
        file,
      };
    }));

    return {
      photo,
      versions: versionsWithUrls,
      notes: notes.map((note) => ({ ...note, id: note._id })),
      annotations: annotations.map((annotation) => ({ ...annotation, id: annotation._id })),
    };
  },
});

export const createAnnotatedVersion = mutation({
  args: {
    photoId: v.id('photos'),
    annotatedProjectFileId: v.id('projectFiles'),
    noteText: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    annotations: v.array(photoAnnotationValidator),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }
    const { userId, user } = await requireProjectFileUser(ctx, photo.projectId);

    const annotatedFile = await ctx.db.get(args.annotatedProjectFileId);
    if (!annotatedFile || annotatedFile.projectId !== photo.projectId) {
      throw new Error('Annotated file not found for this project');
    }
    if (annotatedFile.usage !== 'photo' || annotatedFile.kind !== 'image') {
      throw new Error('Annotated file must be an image photo file');
    }

    const latest = await ctx.db
      .query('photoFileVersions')
      .withIndex('by_photo_versionNumber', (q) => q.eq('photoId', args.photoId))
      .order('desc')
      .take(1);
    const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
    const trimmedNote = args.noteText?.trim();

    const versionId = await ctx.db.insert('photoFileVersions', {
      photoId: args.photoId,
      projectId: photo.projectId,
      ...(photo.projectFileId ? { sourceProjectFileId: photo.projectFileId } : {}),
      annotatedProjectFileId: args.annotatedProjectFileId,
      versionNumber,
      ...(trimmedNote ? { noteText: trimmedNote } : {}),
      authorUserId: userId,
      ...(args.width !== undefined ? { width: args.width } : {}),
      ...(args.height !== undefined ? { height: args.height } : {}),
      createdAt: new Date().toISOString(),
    });

    const role = user?.role ?? 'manager';
    if (trimmedNote) {
      await ctx.db.insert('photoNotes', {
        photoId: args.photoId,
        versionId,
        authorUserId: userId,
        authorName: user?.name ?? user?.email ?? 'משתמש',
        role,
        text: trimmedNote,
      });
    }

    for (const annotation of args.annotations.slice(0, 200)) {
      await ctx.db.insert('photoAnnotations', {
        photoId: args.photoId,
        versionId,
        type: annotation.type,
        x: annotation.x,
        y: annotation.y,
        ...(annotation.w !== undefined ? { w: annotation.w } : {}),
        ...(annotation.h !== undefined ? { h: annotation.h } : {}),
        ...(annotation.r !== undefined ? { r: annotation.r } : {}),
        ...(annotation.points ? { points: annotation.points.slice(0, 500) } : {}),
        color: annotation.color,
        ...(annotation.text ? { text: annotation.text } : {}),
      });
    }

    return { versionId, versionNumber };
  },
});
