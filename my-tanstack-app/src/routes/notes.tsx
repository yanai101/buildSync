import { createFileRoute } from '@tanstack/react-router'
import { NotesScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/notes')({
  component: NotesScreen,
})
