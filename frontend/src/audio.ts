import { SobakaContext } from 'sobaka-sample-web-audio'
import samplerWorkletUrl from 'sobaka-sample-web-audio/dist/lib/sobaka.worklet'
import samplerWasmUrl from 'sobaka-sample-web-audio/pkg/sobaka_sample_web_audio_bg.wasm'

export async function init_sampler(): Promise<SobakaContext> {
  const context = new AudioContext()

  document.addEventListener(
    'click',
    () => {
      void context.resume()
    },
    { once: true }
  )

  const sampler = await SobakaContext.register(
    samplerWasmUrl as unknown as string,
    samplerWorkletUrl as unknown as string,
    context
  )
  sampler.connect(context.destination)

  return sampler
}
