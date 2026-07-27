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
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    nitro(),
  ],
})
