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
  build: {
    target: 'es2020'
  },
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
  },
  define: {
    'process.env.NODE_DEBUG': 'false',
    global: 'globalThis'
  },
  optimizeDeps: {
    // enable esbuild dep optimization during build https://github.com/vitejs/vite/issues/9703#issuecomment-1216662109
    // should be removable with vite 4 https://vitejs.dev/blog/announcing-vite3.html#esbuild-deps-optimization-at-build-time-experimental
    disabled: false,

    // target: es2020 added as workaround to make big ints work
    // - should be removable with vite 4
    // https://github.com/vitejs/vite/issues/9062#issuecomment-1182818044
    esbuildOptions: {
      target: 'es2020'
    }
  }
}

export default config
