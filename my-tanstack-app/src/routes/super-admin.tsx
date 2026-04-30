import { createFileRoute, redirect } from '@tanstack/react-router'
import { SuperAdminScreen } from '../screens/SuperAdminScreen'

export const Route = createFileRoute('/super-admin')({
  beforeLoad: ({ context }) => {
    // Assuming we have access to context or we check it inside the component.
    // Realistically, convex Auth is async, so we usually just check it in a wrapper or in the component.
    // For now, let's render the component. If the user is not super admin, the Convex queries will fail.
  },
  component: SuperAdminScreen,
})
