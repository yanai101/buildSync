import { createFileRoute } from '@tanstack/react-router'
import { ProjectSetupScreen } from '~/screens/ProjectSetupScreen'

export const Route = createFileRoute('/setup')({
  component: ProjectSetupScreen,
})
