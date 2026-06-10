import { createFileRoute } from '@tanstack/react-router'
import { NotesScreen } from '~/screens/NotesScreen'

export const Route = createFileRoute('/notes')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      project: search.project as string | undefined,
      peer: search.peer as string | undefined,
    }
  },
  component: NotesScreen,
})
