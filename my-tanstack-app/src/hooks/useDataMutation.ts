import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCallback } from 'react';

export type MutationResource = 'stages' | 'tasks' | 'boq' | 'photos' | 'project' | 'projects' | 'notes' | 'budget' | 'quotes' | 'timeline' | 'contractors' | 'expenses' | 'checklists';

export const useDataMutation = (resource: MutationResource) => {
  // Convex Mutations
  const genericUpdate = useMutation(api.mutations.update);
  const genericAdd = useMutation(api.mutations.add);
  const genericRemove = useMutation(api.mutations.remove);
  const toggleTaskMutation = useMutation(api.mutations.toggleTask);
  const saveBoqMutation = useMutation(api.mutations.saveBoq);
  const saveProjectSetupMutation = useMutation(api.projects.saveProjectSetup);
  const addExpenseMutation = useMutation(api.budget.addExpense);
  const addCategoryMutation = useMutation(api.budget.addCategory);
  const saveQuoteMutation = useMutation(api.quotes.saveQuote);
  const deleteQuoteMutation = useMutation(api.quotes.deleteQuote);
  const addQuoteTopicMutation = useMutation(api.quotes.addTopic);
  const saveNoteMutation = useMutation(api.mutations.saveNote);
  const markMessagesAsReadMutation = useMutation(api.mutations.markMessagesAsRead);
  const savePhotoAnnotationMutation = useMutation(api.mutations.savePhotoAnnotation);
  const deletePhotoMutation = useMutation(api.mutations.deletePhoto);
  const updatePhotoTagMutation = useMutation(api.mutations.updatePhotoTag);
  const createProjectMutation = useMutation(api.projects.createProject);
  const deleteProjectMutation = useMutation(api.projects.deleteProject);

  const addChecklistMutation = useMutation(api.checklists.addChecklist);
  const deleteChecklistMutation = useMutation(api.checklists.deleteChecklist);
  const addChecklistItemMutation = useMutation(api.checklists.addChecklistItem);
  const toggleChecklistItemMutation = useMutation(api.checklists.toggleChecklistItem);
  const deleteChecklistItemMutation = useMutation(api.checklists.deleteChecklistItem);
  const updateChecklistItemMutation = useMutation(api.checklists.updateChecklistItem);
  const updateChecklistTitleMutation = useMutation(api.checklists.updateChecklistTitle);

  const defaultDbResources: MutationResource[] = ['contractors', 'photos', 'notes', 'project', 'projects', 'expenses', 'budget', 'quotes', 'checklists', 'stages', 'tasks', 'boq', 'timeline'];
  const savedMode = localStorage.getItem(`buildsync:ds:${resource}`);
  const isMock = savedMode ? savedMode !== 'db' : !defaultDbResources.includes(resource);

  const mutate = useCallback(async (action: 'add' | 'update' | 'delete' | 'toggleTask' | 'saveBoq' | 'saveProjectSetup' | 'addExpense' | 'saveNote' | 'markMessagesAsRead' | 'savePhotoAnnotation' | 'deletePhoto' | 'updatePhotoTag' | 'createProject' | 'deleteProject' | 'addBudgetCategory' | 'saveQuote' | 'deleteQuote' | 'addQuoteTopic' | 'addChecklist' | 'deleteChecklist' | 'addChecklistItem' | 'toggleChecklistItem' | 'deleteChecklistItem' | 'updateChecklistItem' | 'updateChecklistTitle', payload: any) => {
    if (isMock) {
      console.log(`[MOCK MUTATION] ${resource}:${action}`, payload);
      return { success: true, mock: true };
    }

    try {
      switch (action) {
        case 'update':
          return await genericUpdate({ table: resource, id: payload.id, patch: payload.patch });
        case 'add':
          return await genericAdd({ table: resource, document: payload.document });
        case 'delete':
          return await genericRemove({ table: resource, id: payload.id });
        case 'toggleTask':
          return await toggleTaskMutation({ taskId: payload.id, done: payload.done });
        case 'saveBoq':
          return await saveBoqMutation({ projectId: payload.projectId, items: payload.items });
        case 'saveProjectSetup':
          return await saveProjectSetupMutation({
            projectId: payload.projectId,
            name: payload.name,
            address: payload.address,
            ownerName: payload.ownerName,
            managerName: payload.managerName,
            inspectorName: payload.inspectorName,
            floors: payload.floors,
            areaSqm: payload.areaSqm,
            budgetTotal: payload.budgetTotal,
            hasBasement: payload.hasBasement,
            hasYard: payload.hasYard,
            housingUnits: payload.housingUnits,
            rooms: payload.rooms
          });
        case 'addExpense':
          return await addExpenseMutation({ projectId: payload.projectId, description: payload.description, amount: payload.amount, category: payload.category, date: payload.date, status: payload.status, fileIds: payload.fileIds });
        case 'addBudgetCategory':
          return await addCategoryMutation({ projectId: payload.projectId, name: payload.name, budget: payload.budget, color: payload.color });
        case 'saveQuote':
          return await saveQuoteMutation({ ...payload });
        case 'deleteQuote':
          return await deleteQuoteMutation({ id: payload.id });
        case 'addQuoteTopic':
          return await addQuoteTopicMutation({ ...payload });
        case 'saveNote':
          return await saveNoteMutation({ projectId: payload.projectId, text: payload.text, thread: payload.thread, recipientContractorId: payload.recipientContractorId });
        case 'markMessagesAsRead':
          return await markMessagesAsReadMutation({ projectId: payload.projectId, thread: payload.thread, ...(payload.filterContractorId ? { filterContractorId: payload.filterContractorId } : {}) });
        case 'savePhotoAnnotation':
          return await savePhotoAnnotationMutation({ photoId: payload.photoId, noteText: payload.noteText, role: payload.role });
        case 'deletePhoto':
          return await deletePhotoMutation({ photoId: payload.photoId });
        case 'updatePhotoTag':
          return await updatePhotoTagMutation({ photoId: payload.photoId, tag: payload.tag });
        case 'createProject':
          return await createProjectMutation({
            name: payload.name,
            address: payload.address,
            ownerName: payload.ownerName,
            managerName: payload.managerName,
            inspectorName: payload.inspectorName,
            floors: payload.floors,
            areaSqm: payload.areaSqm,
            budgetTotal: payload.budgetTotal,
            startDate: payload.startDate,
            expectedEnd: payload.expectedEnd,
            hasBasement: payload.hasBasement,
            hasYard: payload.hasYard,
            housingUnits: payload.housingUnits,
            ...(payload.floorWastePct !== undefined ? { floorWastePct: payload.floorWastePct } : {}),
          });
        case 'deleteProject':
          return await deleteProjectMutation({ projectId: payload.id });
        case 'addChecklist':
          return await addChecklistMutation(payload);
        case 'deleteChecklist':
          return await deleteChecklistMutation(payload);
        case 'addChecklistItem':
          return await addChecklistItemMutation(payload);
        case 'toggleChecklistItem':
          return await toggleChecklistItemMutation(payload);
        case 'deleteChecklistItem':
          return await deleteChecklistItemMutation(payload);
        case 'updateChecklistItem':
          return await updateChecklistItemMutation(payload);
        case 'updateChecklistTitle':
          return await updateChecklistTitleMutation(payload);
        default:
          throw new Error(`Unknown mutation action: ${action}`);
      }
    } catch (err) {
      console.error(`[DB MUTATION ERROR] ${resource}:${action}`, err);
      throw err;
    }
  }, [isMock, resource, genericUpdate, genericAdd, genericRemove, toggleTaskMutation, saveBoqMutation, saveProjectSetupMutation, addExpenseMutation, saveNoteMutation, markMessagesAsReadMutation, savePhotoAnnotationMutation, deletePhotoMutation, updatePhotoTagMutation, createProjectMutation, deleteProjectMutation, addChecklistMutation, deleteChecklistMutation, addChecklistItemMutation, toggleChecklistItemMutation, deleteChecklistItemMutation, updateChecklistItemMutation, updateChecklistTitleMutation]);

  return { mutate };
};
