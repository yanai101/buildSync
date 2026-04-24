import { createFileRoute } from '@tanstack/react-router'
import { PhotosScreen } from '~/screens/PhotosScreen'

export const Route = createFileRoute('/photos')({
  component: PhotosScreen,
})
