import { createFileRoute } from '@tanstack/react-router'
import { BOQScreen } from '~/screens/BOQScreen'

export const Route = createFileRoute('/boq')({
  component: BOQScreen,
})
