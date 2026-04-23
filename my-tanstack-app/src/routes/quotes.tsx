import { createFileRoute } from '@tanstack/react-router'
import { QuotesScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/quotes')({
  component: QuotesScreen,
})
