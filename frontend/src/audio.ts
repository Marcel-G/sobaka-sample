import type { SobakaContext } from 'sobaka-sample-audio-worklet'

export async function init_sampler(): Promise<SobakaContext> {
  const context = new AudioContext()

  document.addEventListener(
    'click',
    () => {
      void context.resume()
    },
    { once: true }
  )

  const { SobakaContext } = await import('sobaka-sample-audio-worklet')

  const sampler = await SobakaContext.register(context)
  sampler.connect(context.destination)

  return sampler
}
