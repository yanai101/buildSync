import * as React from 'react';
import { useMutation } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { RoomPhotoCategory } from '../../../convex/_lib/roomArchiveShared';
import { optimizeImageFile } from '../../hooks/useProjectFileUploader';

export type RoomPhotoUploadInput = {
  file: File;
  roomId: Id<'projectRooms'>;
  stageId?: Id<'stages'>;
  category?: RoomPhotoCategory;
  categories?: RoomPhotoCategory[];
  isCover?: boolean;
  description: string;
  note: string;
};

/**
 * Uploads a room photo. Images are resized/re-encoded with the app-wide
 * `optimizeImageFile` helper before upload, and stored as plain images (not
 * gzipped) so they can be displayed directly via their storage URL.
 */
export function useRoomPhotoUploader(projectId: Id<'projects'> | null) {
  const generateUploadUrl = useMutation(api.roomArchive.generateUploadUrl);
  const createRoomPhoto = useMutation(api.roomArchive.createRoomPhoto);

  return React.useCallback(async (input: RoomPhotoUploadInput) => {
    if (!projectId) throw new Error('יש לבחור פרויקט פעיל');
    const optimized = await optimizeImageFile(input.file);
    const mimeType = optimized.storedMimeType.startsWith('image/') ? optimized.storedMimeType : 'image/jpeg';

    const uploadUrl = await generateUploadUrl({ projectId });
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: optimized.blob,
    });
    if (!res.ok) throw new Error('העלאת התמונה נכשלה');
    const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };

    return await createRoomPhoto({
      projectId,
      roomId: input.roomId,
      stageId: input.stageId,
      storageId,
      originalName: optimized.storedName || input.file.name,
      originalSize: input.file.size,
      category: input.category,
      categories: input.categories,
      isCover: input.isCover,
      description: input.description,
      note: input.note,
      takenOn: new Date().toISOString().slice(0, 10),
    });
  }, [createRoomPhoto, generateUploadUrl, projectId]);
}
