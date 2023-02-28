import { sveltekit } from '@sveltejs/kit/vite'

// https://github.com/vitejs/vite/issues/9864#issuecomment-1232032770
const crossOriginIsolationForPreview = {
  name: 'cross-origin-isolation-for-preview',
  configurePreviewServer: server => {
    server.middlewares.use((_, res, next) => {
      res.setHeader('cross-origin-opener-policy', 'same-origin')
      res.setHeader('cross-origin-embedder-policy', 'require-corp')
      res.setHeader('cross-origin-resource-policy', 'cross-origin')
      next()
    })
  }
}
/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit(), crossOriginIsolationForPreview],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['../sobaka-dsp']
    }
  }
}

export default config
