import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'

function crossOriginIsolationMiddleware(_, response, next) {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}

const crossOriginIsolation = {
  name: 'cross-origin-isolation',
  configureServer: server => {
    server.middlewares.use(crossOriginIsolationMiddleware)
  },
  configurePreviewServer: server => {
    server.middlewares.use(crossOriginIsolationMiddleware)
  }
}

/** @type {import('vite').UserConfig} */
const config = {
  build: {
    target: 'esnext'
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    // Exclude workspace packages from optimization - they're handled directly by Vite
    exclude: ['@sobaka/state', '@sobaka/dsp', '@sobaka/ui']
  },
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.svelte']
  },
  plugins: [crossOriginIsolation, tailwindcss(), sveltekit()],
  server: {
    host: '127.0.0.1',
    fs: {
      // Allow serving files from workspace packages
      allow: ['../../packages/dsp', '../../packages/ui', '../../packages/state']
    }
  },
  ssr: {
    // Don't externalize workspace packages - let Vite handle them
    noExternal: ['@sobaka/state', '@sobaka/dsp', '@sobaka/ui']
  }
}

export default config
