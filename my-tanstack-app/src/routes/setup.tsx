import { createFileRoute } from '@tanstack/react-router'
import { ProjectSetupScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/setup')({
  component: ProjectSetupScreen,
})
