import * as React from 'react';
import { useMutation } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type ProjectFileUsage = 'photo' | 'receipt' | 'quote' | 'document';
type ProjectFileKind = 'image' | 'pdf' | 'document' | 'other';

type OptimizedFile = {
  blob: Blob;
  storedName: string;
  storedMimeType: string;
  width?: number;
  height?: number;
};

const MAX_IMAGE_EDGE = 2000;

const extensionForMime = (mimeType: string) => {
  if (mimeType === 'image/avif') return 'avif';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/jpeg') return 'jpg';
  return 'bin';
};

const replaceExtension = (name: string, mimeType: string) => {
  const extension = extensionForMime(mimeType);
  const base = name.replace(/\.[^.]+$/, '') || 'upload';
  return `${base}.${extension}`;
};

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) => new Promise<Blob | null>((resolve) => {
  canvas.toBlob(resolve, mimeType, quality);
});

const loadImage = async (file: File) => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const optimizeImageFile = async (file: File): Promise<OptimizedFile> => {
  if (!file.type.startsWith('image/')) {
    return {
      blob: file,
      storedName: file.name,
      storedMimeType: file.type || 'application/octet-stream',
    };
  }

  const image = await loadImage(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (!originalWidth || !originalHeight) {
    return {
      blob: file,
      storedName: file.name,
      storedMimeType: file.type || 'application/octet-stream',
    };
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      blob: file,
      storedName: file.name,
      storedMimeType: file.type || 'application/octet-stream',
      width: originalWidth,
      height: originalHeight,
    };
  }

  ctx.drawImage(image, 0, 0, width, height);

  const candidates = [
    { mimeType: 'image/avif', quality: 0.72 },
    { mimeType: 'image/webp', quality: 0.82 },
    { mimeType: 'image/jpeg', quality: 0.86 },
  ];

  for (const candidate of candidates) {
    const blob = await canvasToBlob(canvas, candidate.mimeType, candidate.quality);
    if (blob && blob.size > 0 && blob.size < file.size) {
      return {
        blob,
        storedName: replaceExtension(file.name, candidate.mimeType),
        storedMimeType: candidate.mimeType,
        width,
        height,
      };
    }
  }

  return {
    blob: file,
    storedName: file.name,
    storedMimeType: file.type || 'application/octet-stream',
    width: originalWidth,
    height: originalHeight,
  };
};

export function useProjectFileUploader() {
  const generateUploadUrl = useMutation(api.projectFiles.generateUploadUrl);
  const createProjectFile = useMutation(api.projectFiles.createProjectFile);

  return React.useCallback(async ({
    projectId,
    file,
    usage,
    kind = 'image',
    contractorId,
  }: {
    projectId: Id<'projects'>;
    file: File;
    usage: ProjectFileUsage;
    kind?: ProjectFileKind;
    contractorId?: Id<'contractors'>;
  }) => {
    const optimized = await optimizeImageFile(file);
    const uploadUrl = await generateUploadUrl({ projectId });
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': optimized.storedMimeType },
      body: optimized.blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('File upload failed');
    }

    const { storageId } = await uploadResponse.json() as { storageId: Id<'_storage'> };
    const fileId = await createProjectFile({
      projectId,
      storageId,
      usage,
      kind,
      originalName: file.name,
      storedName: optimized.storedName,
      originalMimeType: file.type || 'application/octet-stream',
      storedMimeType: optimized.storedMimeType,
      originalSize: file.size,
      storedSize: optimized.blob.size,
      ...(optimized.width !== undefined ? { width: optimized.width } : {}),
      ...(optimized.height !== undefined ? { height: optimized.height } : {}),
      ...(contractorId ? { contractorId } : {}),
    });

    return {
      fileId,
      storageId,
      originalSize: file.size,
      storedSize: optimized.blob.size,
      storedMimeType: optimized.storedMimeType,
    };
  }, [createProjectFile, generateUploadUrl]);
}
