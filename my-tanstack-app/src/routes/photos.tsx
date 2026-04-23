import { createFileRoute } from '@tanstack/react-router'
import { PhotosScreen } from '~/components/LegacyScreens'

export const Route = createFileRoute('/photos')({
  component: PhotosScreen,
})
