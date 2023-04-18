import { sveltekit } from '@sveltejs/kit/vite'

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
  plugins: [crossOriginIsolation, sveltekit()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['../sobaka-dsp']
    }
  }
}

export default config
