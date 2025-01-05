import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // See SPA mode docs https://github.com/sveltejs/kit/blob/master/packages/adapter-static/README.md#spa-mode
    adapter: adapter({
      fallback: '404.html'
    })
  }
}

export default config
