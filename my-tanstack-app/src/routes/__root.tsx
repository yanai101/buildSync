import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import appCss from '~/styles/app.css?url'
import { seo } from '~/utils/seo'
import { AppLayout } from '~/components/Layout'
import { convex } from '~/convex'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
      ...seo({
        title: 'BuildSync - פלטפורמה מתקדמת לניהול בנייה ושיפוצים',
        description: `שליטה מוחלטת בכתבי כמויות, תקציב, קבלנים ותקשורת בשטח. מוציאים מיליונים על הנכס? תנהלו אותו חכם.`,
        image: 'https://buildsync.vercel.app/og-image.png',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/logo.png' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

import { ProjectProvider } from '~/hooks/useCurrentProject'

function RootDocument({ children }: { children: React.ReactNode }) {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage

  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="root">
          <ConvexAuthProvider client={convex} storage={storage} storageNamespace="buildsync-auth">
            <ProjectProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </ProjectProvider>
          </ConvexAuthProvider>
        </div>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
