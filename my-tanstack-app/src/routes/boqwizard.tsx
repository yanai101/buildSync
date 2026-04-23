import { createFileRoute } from '@tanstack/react-router'
import { BOQWizardScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/boqwizard')({
  component: BOQWizardScreen,
})
