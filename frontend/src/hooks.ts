import type { Handle } from '@sveltejs/kit'
import config from '../vite.config'
import { dev } from '$app/environment'

/**
 * https://gist.github.com/michaelwooley/3d35e552fbaeaa44801f93228c486a8a
 * Factory that generates a function to update response headers in dev mode in order to
 * incorporate headers specified as part of vite config. If we don't do this, then fetching,
 * e.g., html @ "/" in dev mode will not include our headers!
 *
 * In prod, need to use adapter-specific means to specify custom headers.
 *
 * @returns Function that updates response headers.
 */
const updateResponseHeadersInDevFactory = (): ((r: Response) => void) => {
  const doNothing = (_: Response): void => undefined

  /** In prod, need to use an adapter like netlify, cloudflare, etc. that can support custom headers. Adding headers here has no effect in a purely static site. */
  if (!dev) {
    return doNothing
  }

  // If custom headers were specified in the svelte config...
  if (config.server?.headers) {
    // Extract the headers...
    const headerArray = Object.entries(config.server?.headers as Record<string, string>)
      .filter(([, v]) => v)
      .map(([k, v]) => [k, v?.toString() || ''])

    // Generate a fn that updates the response headers.
    const updateHeaders = (r: Response): void => {
      headerArray.forEach(([k, v]) => r.headers.append(k, v))
    }
    return updateHeaders
  }
  return doNothing
}

const updateResponseHeadersInDev = updateResponseHeadersInDevFactory()

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)

  updateResponseHeadersInDev(response)

  return response
}
