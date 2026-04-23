import { createFileRoute } from '@tanstack/react-router'
import { BOQScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/boq')({
  component: BOQScreen,
})
