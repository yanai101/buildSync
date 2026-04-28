import { createFileRoute } from '@tanstack/react-router'
import { TeamScreen } from '~/screens/TeamScreen'

export const Route = createFileRoute('/team')({
  component: TeamScreen,
})
