import { createFileRoute } from '@tanstack/react-router';
import { ContractorRecommendationsScreen } from '~/screens/ContractorRecommendationsScreen';

export const Route = createFileRoute('/contractor-recommendations')({
  validateSearch: (search: Record<string, unknown>) => ({ contractorId: typeof search.contractorId === 'string' ? search.contractorId : undefined }),
  component: ContractorRecommendationsScreen,
});
