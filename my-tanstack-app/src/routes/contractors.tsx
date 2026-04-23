import { createFileRoute } from '@tanstack/react-router'
import { ContractorsScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/contractors')({
  component: ContractorsScreen,
})
