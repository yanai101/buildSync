import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// Content types that must never be stored: they can be rendered as a page by
// the browser and used for phishing/XSS if the file URL is shared.
const BLOCKED_CONTENT_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
]);

/**
 * Validates an uploaded storage file against the real metadata recorded by
 * Convex storage (not the client-claimed values). Deletes the file and throws
 * if it violates the limits. Returns the trusted metadata on success.
 */
export const validateUploadedFile = async (ctx: MutationCtx, storageId: Id<'_storage'>) => {
  const metadata = await ctx.db.system.get(storageId);
  if (!metadata) {
    throw new Error('Uploaded file was not found in storage');
  }

  if (metadata.size > MAX_FILE_SIZE_BYTES) {
    await ctx.storage.delete(storageId);
    throw new Error(`הקובץ גדול מדי — הגודל המרבי הוא ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB`);
  }

  const contentType = (metadata.contentType ?? '').split(';')[0].trim().toLowerCase();
  if (BLOCKED_CONTENT_TYPES.has(contentType)) {
    await ctx.storage.delete(storageId);
    throw new Error('סוג הקובץ אינו נתמך');
  }

  return metadata;
};
