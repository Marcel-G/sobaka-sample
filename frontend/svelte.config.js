import adapter from '@sveltejs/adapter-static'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    // See SPA mode docs https://github.com/sveltejs/kit/blob/master/packages/adapter-static/README.md#spa-mode
    adapter: adapter({
      fallback: 'index.html'
    }),
    prerender: {
      entries: []
    }
  }
}

export default config
