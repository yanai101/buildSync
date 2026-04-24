import { createFileRoute } from '@tanstack/react-router'
import { ContractorsScreen } from '~/screens/ContractorsScreen'

export const Route = createFileRoute('/contractors')({
  component: ContractorsScreen,
})
