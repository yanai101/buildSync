import { createFileRoute } from '@tanstack/react-router'
import { StagesScreen } from '~/screens/StagesScreen'

export const Route = createFileRoute('/stages')({
  component: StagesScreen,
})
