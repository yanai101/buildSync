import { createFileRoute } from '@tanstack/react-router'
import { DailyLogsScreen } from '../screens/DailyLogsScreen'

export const Route = createFileRoute('/daily-logs')({
  component: DailyLogsScreen,
})
