import * as React from 'react';
import { useMutation } from 'convex/react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { optimizeImageFile } from './useProjectFileUploader';
import { generatePdfThumbnail } from '../utils/pdfThumbnail';
import { useCurrentProject } from './useCurrentProject';

export function usePlanUploader(projectId: Id<'projects'> | null) {
  const { subscription } = useCurrentProject();
  const generateUploadUrl = useMutation(api.projectPlans.generateUploadUrl);
  const createProjectPlan = useMutation(api.projectPlans.createProjectPlan);
  const uploadNewVersion = useMutation(api.projectPlans.uploadNewVersion);
  const saveThumbnail = useMutation(api.projectPlans.saveThumbnail);

  return React.useCallback(async ({
    file,
    name,
    description,
    category,
    stageIds,
    sharedWithContractorIds,
    onProgress,
    parentPlanId
  }: {
    file: File;
    name: string;
    description?: string;
    category: any;
    stageIds: Id<'stages'>[];
    sharedWithContractorIds?: Id<'contractors'>[];
    onProgress?: (pct: number) => void;
    parentPlanId?: Id<'projectPlans'>;
  }) => {
    if (!projectId) throw new Error('יש לבחור פרויקט פעיל');

    // 1. Validate single file size
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('גודל הקובץ חורג מהמקסימום המותר לקובץ בודד (25MB). נא לכווץ את הקובץ לפני ההעלאה.');
    }
    
    // We also have a total storage check on the backend, so if they exceed total storage, it will throw there.

    onProgress?.(10);

    // 2. Optimization (Images only)
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|heic|heif|bmp|gif)$/i.test(file.name);
    let finalBlob: Blob = file;
    let finalMimeType = file.type || 'application/octet-stream';
    let finalStoredName = file.name;

    if (isImage) {
      const optimized = await optimizeImageFile(file);
      finalBlob = optimized.blob;
      finalMimeType = optimized.storedMimeType;
      finalStoredName = optimized.storedName;
    }

    onProgress?.(30);

    // 3. Upload Main File
    const uploadUrl = await generateUploadUrl({ projectId });
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': finalMimeType },
      body: finalBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error('העלאת הקובץ נכשלה');
    }

    const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
    
    onProgress?.(70);

    // 4. Create Plan Record or New Version
    let planId: Id<'projectPlans'>;
    if (parentPlanId) {
      planId = await uploadNewVersion({
        parentPlanId,
        storageId,
        originalName: file.name,
        storedName: finalStoredName,
        originalMimeType: file.type || 'application/octet-stream',
        storedMimeType: finalMimeType,
        originalSize: file.size,
        storedSize: finalBlob.size,
      });
    } else {
      planId = await createProjectPlan({
        projectId,
        storageId,
        name,
        description,
        category,
        stageIds,
        originalName: file.name,
        storedName: finalStoredName,
        originalMimeType: file.type || 'application/octet-stream',
        storedMimeType: finalMimeType,
        originalSize: file.size,
        storedSize: finalBlob.size,
        sharedWithContractorIds,
      });
    }

    onProgress?.(90);

    // 5. Generate and Upload Thumbnail for PDF (background process, doesn't block completion)
    if (file.type === 'application/pdf') {
      generatePdfThumbnail(file).then(async (thumbBlob) => {
        if (!thumbBlob) return;
        const thumbUploadUrl = await generateUploadUrl({ projectId });
        const thumbRes = await fetch(thumbUploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'image/webp' },
          body: thumbBlob,
        });
        if (thumbRes.ok) {
          const { storageId: thumbStorageId } = await thumbRes.json();
          await saveThumbnail({ planId, storageId: thumbStorageId });
        }
      }).catch(console.error);
    }

    onProgress?.(100);

    return planId;
  }, [projectId, generateUploadUrl, createProjectPlan, uploadNewVersion, saveThumbnail, subscription?.tier]);
}
