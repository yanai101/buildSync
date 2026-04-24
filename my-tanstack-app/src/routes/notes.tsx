import { createFileRoute } from '@tanstack/react-router'
import { NotesScreen } from '~/screens/NotesScreen'

export const Route = createFileRoute('/notes')({
  component: NotesScreen,
})
