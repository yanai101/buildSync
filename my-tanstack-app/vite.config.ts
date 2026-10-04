import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { vercelAssetCache } from './nitro-modules/vercelAssetCache'

export default defineConfig({
  server: {
    port: 3000,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['error', 'warn']
    }
  },
  resolve: {
    tsconfigPaths: true,
  },
  // Identifies the deployment in chunk-recovery diagnostics (~/utils/chunkRecovery).
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      [process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7), process.env.VERCEL_DEPLOYMENT_ID].filter(Boolean).join(' ') || 'local'
    ),
  },
  // html2pdf.js is browser-only (uses `self`, `window`).
  // We keep it external in SSR so Node never requires it.
  // Do NOT exclude from optimizeDeps — Vite must pre-bundle it so
  // the browser dynamic import resolves correctly.
  ssr: {
    noExternal: [],
    external: ['html2pdf.js'],
  },
  build: {
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-is')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack') || id.includes('@tanstack/react-start')) {
              return 'router-vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('tailwind-merge')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts') || id.includes('convex')) {
              return 'data-vendor';
            }
          }
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    nitro({
      modules: [vercelAssetCache],
      routeRules: {
        // The landing page moved from its /landing preview to / (public/index.html).
        // Exact paths only: /landing/stage-*.webp are the page's images and must not redirect.
        '/landing': { redirect: { to: '/', status: 301 } },
        '/landing/': { redirect: { to: '/', status: 301 } },
      },
    }),
  ],
})
