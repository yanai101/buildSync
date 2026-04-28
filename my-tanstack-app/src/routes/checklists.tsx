import { createFileRoute } from '@tanstack/react-router'
import { ChecklistsScreen } from '~/screens/ChecklistsScreen'

export const Route = createFileRoute('/checklists')({
  component: ChecklistsScreen,
})
