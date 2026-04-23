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
        title: 'BuildSync - ניהול תהליך בנייה',
        description: `ניהול בנייה ושיפוצים`,
      }),
    ],
    links: [
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="root">
          <ConvexAuthProvider client={convex}>
            <AppLayout>
              {children}
            </AppLayout>
          </ConvexAuthProvider>
        </div>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
