import { createFileRoute } from '@tanstack/react-router'
import { DailyLogsScreen } from '../screens/DailyLogsScreen'

export const Route = createFileRoute('/daily-logs')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      project: search.project as string | undefined,
      date: search.date as string | undefined,
    }
  },
  component: DailyLogsScreen,
})
