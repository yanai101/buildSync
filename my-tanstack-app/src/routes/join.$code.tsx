import { createFileRoute } from '@tanstack/react-router'
import { JoinScreen } from '~/screens/JoinScreen'

export const Route = createFileRoute('/join/$code')({
  component: JoinRoute,
})

function JoinRoute() {
  const { code } = Route.useParams()
  return <JoinScreen code={code} />
}
