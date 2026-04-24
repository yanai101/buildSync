import { createFileRoute } from '@tanstack/react-router'
import { TimelineScreen } from '~/screens/TimelineScreen'

export const Route = createFileRoute('/timeline')({
  component: TimelineScreen,
})
