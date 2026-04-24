import { createFileRoute } from '@tanstack/react-router'
import { BOQWizardScreen } from '~/screens/BOQWizardScreen'

export const Route = createFileRoute('/boqwizard')({
  component: BOQWizardScreen,
})
