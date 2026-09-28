import { createFileRoute } from '@tanstack/react-router'
import { PlansScreen } from '~/screens/PlansScreen'

export const Route = createFileRoute('/plans')({
  component: PlansScreen,
})
