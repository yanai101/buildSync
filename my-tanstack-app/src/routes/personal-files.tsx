import { createFileRoute } from '@tanstack/react-router'
import { PersonalFilesScreen } from '~/screens/PersonalFilesScreen'

export const Route = createFileRoute('/personal-files')({
  component: PersonalFilesScreen,
})
