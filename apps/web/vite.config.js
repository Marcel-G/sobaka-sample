import path from 'node:path'
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
  resolve: {
    alias: {
      // Path for max message length issue: https://github.com/yjs/y-webrtc/issues/20
      // Redirect y-webrtc's import to our extended version
      'simple-peer/simplepeer.min.js': path.resolve(
        __dirname,
        '../../packages/state/src/networking/peer.ts'
      ),
      'simple-peer-vendor': 'simple-peer/simplepeer.min.js'
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.svelte']
  },
  plugins: [crossOriginIsolation, tailwindcss(), sveltekit()],
  server: {
    host: "127.0.0.1",
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
