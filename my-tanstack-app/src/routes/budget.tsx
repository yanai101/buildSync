import { createFileRoute } from '@tanstack/react-router'
import { BudgetScreen } from '~/screens/BudgetScreen'

export const Route = createFileRoute('/budget')({
  component: BudgetScreen,
})
