import { createFileRoute } from '@tanstack/react-router';
import { GuidesScreen } from '~/screens/GuidesScreen';

import { ErrorBoundary } from '../components/ErrorBoundary';

export const Route = createFileRoute('/guides')({
  component: () => (
    <ErrorBoundary>
      <GuidesScreen />
    </ErrorBoundary>
  ),
});
