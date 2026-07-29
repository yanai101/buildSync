import { createFileRoute } from '@tanstack/react-router';
import { AnnouncementsScreen } from '~/screens/AnnouncementsScreen';

export const Route = createFileRoute('/announcements')({
  component: AnnouncementsScreen,
});
