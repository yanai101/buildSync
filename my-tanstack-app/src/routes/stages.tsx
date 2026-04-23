import { createFileRoute } from '@tanstack/react-router'
import { StagesScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/stages')({
  component: StagesScreen,
})
