import init, { registerContext } from '@sobaka/dsp/wasm'
import shimUrl from '@sobaka/dsp/wasm?url'

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
        console.warn('[Audio] Failed to resume context:', err)
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
        console.warn('[Audio] Failed to resume context on visibility change:', err)
      })
    }
  })
  
  // Monitor audio context state changes
  ctx.addEventListener('statechange', () => {
    if (ctx.state === 'suspended') {
      console.info('[Audio] Context suspended by browser')
    } else if (ctx.state === 'running') {
      console.info('[Audio] Context running')
    } else if (ctx.state === 'closed') {
      console.warn('[Audio] Context closed')
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
    console.error('[Audio] Cannot resume closed context')
    return false
  }
  
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
      console.info('[Audio] Context resumed successfully')
      return true
    } catch (err) {
      console.error('[Audio] Failed to resume:', err)
      return false
    }
  }
  
  return ctx.state === 'running'
}
