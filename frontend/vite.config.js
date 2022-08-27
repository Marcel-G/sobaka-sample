import { sveltekit } from '@sveltejs/kit/vite'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['../audio-worklet']
    }
  },
  build: {
    /**
     * Specific Rollup options needed to properly load the worklet.
     * The actual AudioWorkletProcessor js source code is not discoverable
     * by the bundler since it's pre-built into the wasm binary.
     *
     * see: audio-worklet/src/worklet/utils/dependent_module.rs
     */
    rollupOptions: {
      treeshake: false,
      output: {
        minifyInternalExports: false,
        manualChunks: id => {
          if (id.includes('audio-worklet') && id.includes('pkg')) {
            return 'audio-worklet'
          }
        }
      }
    }
  }
}

export default config
