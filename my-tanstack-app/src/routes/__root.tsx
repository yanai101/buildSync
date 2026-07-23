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
        description: `שליטה מוחלטת בניהול עלויות רכש, תקציב, קבלנים ותקשורת בשטח. מוציאים מיליונים על הנכס? תנהלו אותו חכם.`,
        image: 'https://buildsync.co.il/og-image.png',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/logo.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

import { ProjectProvider } from '~/hooks/useCurrentProject'
import { usePushSubscriptionSync } from '~/hooks/usePushNotifications'
import { usePendingInviteRedeem } from '~/hooks/usePendingInviteRedeem'

function PushSubscriptionSync() {
  usePushSubscriptionSync()
  return null
}

function PendingInviteRedeem() {
  usePendingInviteRedeem()
  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning={true}>
      <head suppressHydrationWarning={true}>
        <HeadContent />
        {/* Inline theme init — runs before React to prevent flash on loading screen */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem('buildsync:theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var isDark = saved === 'dark' ? true : saved === 'light' ? false : prefersDark;
              document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
              document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
            } catch(e) {}
          })();
        `}} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPrompt = e;
              });
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <div id="root">
          <ConvexAuthProvider client={convex} storage={storage} storageNamespace="buildsync-auth">
            <PushSubscriptionSync />
            <PendingInviteRedeem />
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
