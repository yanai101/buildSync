import { createFileRoute } from '@tanstack/react-router'
import { BudgetScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/budget')({
  component: BudgetScreen,
})
