import * as React from 'react';
import { useMutation } from 'convex/react';
import { gzip } from 'fflate';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

import { optimizeImageFile } from './useProjectFileUploader';

const compressFile = (bytes: Uint8Array): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    gzip(bytes, { level: 6 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

export function usePersonalFileUploader() {
  const generateUploadUrl = useMutation(api.personalFiles.generateUploadUrl);
  const createPersonalFile = useMutation(api.personalFiles.createPersonalFile);

  return React.useCallback(async (file: File, sectionId?: string, note?: string) => {
    let finalFileToUpload: File | Blob = file;
    let finalMimeType = file.type || 'application/octet-stream';
    let originalName = file.name;

    if (file.type.startsWith('image/')) {
      const optimized = await optimizeImageFile(file);
      finalFileToUpload = optimized.blob;
      finalMimeType = optimized.storedMimeType;
      originalName = optimized.storedName;
    }

    const buffer = new Uint8Array(await finalFileToUpload.arrayBuffer());
    const compressed = await compressFile(buffer);
    const blob = new Blob([compressed.buffer as ArrayBuffer], { type: 'application/gzip' });

    const uploadUrl = await generateUploadUrl({});
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/gzip' },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('העלאת הקובץ נכשלה');
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    const fileId = await createPersonalFile({
      storageId,
      originalName: originalName,
      storedName: `${originalName}.gz`,
      originalMimeType: finalMimeType,
      originalSize: file.size,
      storedSize: blob.size,
      sectionId,
      note,
    });

    return {
      fileId,
      originalSize: file.size,
      storedSize: blob.size,
    };
  }, [createPersonalFile, generateUploadUrl]);
}
