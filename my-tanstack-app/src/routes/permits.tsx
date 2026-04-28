import { createFileRoute } from '@tanstack/react-router'
import { PermitsScreen } from '../screens/PermitsScreen'

export const Route = createFileRoute('/permits')({
  component: PermitsScreen,
})
