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
  //
  // markitdown-ts pulls in jsdom, which does
  // `require.resolve('./xhr-sync-worker.js')` at load time. Bundling jsdom
  // drops that file and the require throws, taking down the whole server.
  // Keeping both external makes Node resolve them from node_modules instead.
  ssr: {
    noExternal: [],
    external: ['html2pdf.js', 'markitdown-ts', 'jsdom'],
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
