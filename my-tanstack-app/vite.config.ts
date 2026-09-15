import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

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
    nitro(),
  ],
})
