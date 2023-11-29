import adapter from '@sveltejs/adapter-static'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    prerender: {
      handleHttpError: () => {
        // Ignore all errors as @libp2p/webrtc -> node-datachannel failes to load during prerendering
        // @todo fix this
        return 
      }
    },
    // See SPA mode docs https://github.com/sveltejs/kit/blob/master/packages/adapter-static/README.md#spa-mode
    adapter: adapter({
      fallback: '404.html'
    })
  }
}

export default config
