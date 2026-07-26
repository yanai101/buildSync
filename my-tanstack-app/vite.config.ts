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
  // html2pdf.js is browser-only (uses `self`, `window`) — must never be
  // bundled or evaluated on the server side.
  optimizeDeps: {
    exclude: ['html2pdf.js'],
  },
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
