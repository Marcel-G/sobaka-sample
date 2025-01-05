import { METERED_API_KEY } from '$env/static/private'
import { PUBLIC_SIGNALING_URL } from '$env/static/public'

import type { LayoutServerLoad } from './$types'

export interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface Config {
  iceServers: IceServer[]
  signaling: string[]
}

const fetchIceServers = async (fetch: typeof globalThis.fetch): Promise<IceServer[]> => {
  try {
    if (!METERED_API_KEY) {
      throw new Error('METERED_API_KEY is not set')
    }
    const response = await fetch(
      `https://sobaka.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`
    )

    if (response.ok) {
      const data = await response.json()
      return data
    }
  } catch {
    // Fallback to static configuration in case of error or timeout
  }

  return [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478']
    }
  ]
}

export const load: LayoutServerLoad = async ({ fetch }): Promise<{ config: Config }> => {
  return {
    config: {
      iceServers: await fetchIceServers(fetch),
      signaling: [PUBLIC_SIGNALING_URL]
    }
  }
}
