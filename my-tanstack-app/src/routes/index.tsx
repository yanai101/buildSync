import { createFileRoute } from '@tanstack/react-router'
import { DashboardScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/')({
  component: DashboardScreen,
})
