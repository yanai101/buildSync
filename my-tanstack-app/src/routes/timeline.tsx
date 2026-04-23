import { createFileRoute } from '@tanstack/react-router'
import { TimelineScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/timeline')({
  component: TimelineScreen,
})
