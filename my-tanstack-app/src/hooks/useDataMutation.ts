import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCallback } from 'react';

export type MutationResource = 'stages' | 'tasks' | 'boq' | 'photos' | 'project' | 'projects' | 'notes' | 'budget' | 'quotes' | 'timeline' | 'contractors' | 'expenses';

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
  const savePhotoAnnotationMutation = useMutation(api.mutations.savePhotoAnnotation);
  const createProjectMutation = useMutation(api.projects.createProject);
  const deleteProjectMutation = useMutation(api.projects.deleteProject);

  const isMock = localStorage.getItem(`buildsync:ds:${resource}`) !== 'db';

  const mutate = useCallback(async (action: 'add' | 'update' | 'delete' | 'toggleTask' | 'saveBoq' | 'saveProjectSetup' | 'addExpense' | 'saveNote' | 'savePhotoAnnotation' | 'createProject' | 'deleteProject' | 'addBudgetCategory' | 'saveQuote' | 'deleteQuote' | 'addQuoteTopic', payload: any) => {
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
            rooms: payload.rooms 
          });
        case 'addExpense':
          return await addExpenseMutation({ projectId: payload.projectId, description: payload.description, amount: payload.amount, category: payload.category, date: payload.date, status: payload.status });
        case 'addBudgetCategory':
          return await addCategoryMutation({ projectId: payload.projectId, name: payload.name, budget: payload.budget, color: payload.color });
        case 'saveQuote':
          return await saveQuoteMutation({ ...payload });
        case 'deleteQuote':
          return await deleteQuoteMutation({ id: payload.id });
        case 'addQuoteTopic':
          return await addQuoteTopicMutation({ ...payload });
        case 'saveNote':
          return await saveNoteMutation({ projectId: payload.projectId, fromName: payload.fromName, role: payload.role, text: payload.text, thread: payload.thread });
        case 'savePhotoAnnotation':
          return await savePhotoAnnotationMutation({ photoId: payload.photoId, noteText: payload.noteText, role: payload.role });
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
            expectedEnd: payload.expectedEnd
          });
        case 'deleteProject':
          return await deleteProjectMutation({ projectId: payload.id });
        default:
          throw new Error(`Unknown mutation action: ${action}`);
      }
    } catch (err) {
      console.error(`[DB MUTATION ERROR] ${resource}:${action}`, err);
      throw err;
    }
  }, [isMock, resource, genericUpdate, genericAdd, genericRemove, toggleTaskMutation, saveBoqMutation, saveProjectSetupMutation, addExpenseMutation, saveNoteMutation, savePhotoAnnotationMutation, createProjectMutation, deleteProjectMutation]);

  return { mutate };
};
