import { sveltekit } from '@sveltejs/kit/vite'
import fs from 'node:fs';
import path from 'node:path';

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
  plugins: [crossOriginIsolation, sveltekit()],

  optimizeDeps: {
    // exclude: [
    //   '@chainsafe/libp2p-gossipsub',
    // ],
    include: [
      '@chainsafe/libp2p-gossipsub',
      // '@chainsafe/libp2p-gossipsub',
      // '@libp2p/webrtc', 'multihashes', '@chainsafe/libp2p-gossipsub',
    ]
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: [
        '../sobaka-dsp',
        // '../../../random/js-libp2p-webrtc',
        // '../../../random/js-libp2p-gossipsub',
      ]
    }
  }
}


export default config
