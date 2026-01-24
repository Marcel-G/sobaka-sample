import init, { registerContext } from '@sobaka/dsp/wasm'
import shimUrl from '@sobaka/dsp/wasm?url'

export const load = async (ctx: AudioContext) => {
  const handleInteraction = () => {
    if (ctx.state === 'suspended') {
      void ctx?.resume()
    }
  }
  document?.addEventListener('click', handleInteraction, { once: true })

  await init()
  await registerContext(ctx, new URL(shimUrl, import.meta.url).href)
}
