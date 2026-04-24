import { createFileRoute } from '@tanstack/react-router'
import { QuotesScreen } from '~/screens/QuotesScreen'

export const Route = createFileRoute('/quotes')({
  component: QuotesScreen,
})
