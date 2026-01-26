import init, { registerContext } from '@sobaka/dsp/wasm'
import shimUrl from '@sobaka/dsp/wasm?url'
import { createLogger } from '@sobaka/state'

const logger = createLogger('Audio')

/**
 * Initialize audio context and WASM module
 *
 * Handles:
 * - WASM module initialization
 * - Audio context registration with worklets
 * - Automatic resumption when browser suspends audio
 */
export const load = async (ctx: AudioContext) => {
  // Resume audio context on any user interaction
  // Uses capture phase to catch events before they're handled
  const handleInteraction = () => {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(err => {
        logger.warn('Failed to resume context:', err)
      })
    }
  }

  // Listen for multiple interaction types (not just click)
  // Don't use { once: true } - browser can suspend audio multiple times
  const interactionEvents = ['click', 'touchstart', 'keydown']
  interactionEvents.forEach(event => {
    document?.addEventListener(event, handleInteraction, { capture: true, passive: true })
  })

  // Listen for visibility changes to resume when tab becomes active again
  document?.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx.state === 'suspended') {
      void ctx.resume().catch(err => {
        logger.warn('Failed to resume context on visibility change:', err)
      })
    }
  })

  // Monitor audio context state changes
  ctx.addEventListener('statechange', () => {
    if (ctx.state === 'suspended') {
      logger.info('Context suspended by browser')
    } else if (ctx.state === 'running') {
      logger.info('Context running')
    } else if (ctx.state === 'closed') {
      logger.warn('Context closed')
    }
  })

  await init()
  await registerContext(ctx, new URL(shimUrl, import.meta.url).href)
}

/**
 * Force resume the audio context
 * Call this if audio stops unexpectedly
 */
export const resumeAudio = async (ctx: AudioContext): Promise<boolean> => {
  if (ctx.state === 'closed') {
    logger.error('Cannot resume closed context')
    return false
  }

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
      logger.info('Context resumed successfully')
      return true
    } catch (err) {
      logger.error('Failed to resume:', err)
      return false
    }
  }

  return ctx.state === 'running'
}
