import { createFileRoute } from '@tanstack/react-router';
import { OrdersTrackingScreen } from '../screens/OrdersTrackingScreen';

export const Route = createFileRoute('/orders')({
  component: OrdersTrackingScreen,
});
