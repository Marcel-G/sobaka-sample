import { SobakaContext } from 'sobaka-sample-audio-worklet'
import samplerWorkletUrl from 'sobaka-sample-audio-worklet/dist/lib/sobaka.worklet'
import samplerWasmUrl from 'sobaka-sample-audio-worklet/dist/pkg/sobaka_sample_audio_worklet_bg.wasm'

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
