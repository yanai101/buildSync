import { createFileRoute } from '@tanstack/react-router';
import { GuidesScreen } from '~/screens/GuidesScreen';

export const Route = createFileRoute('/guides')({
  component: GuidesScreen,
});
