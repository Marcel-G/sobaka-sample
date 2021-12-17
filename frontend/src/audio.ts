import { SamplerNode } from 'sobaka-sample-web-audio'

export async function init_sampler(): Promise<SamplerNode> {
  const context = new AudioContext()

  document.addEventListener(
    'click',
    () => {
      void context.resume()
    },
    { once: true }
  )

  const sampler = await SamplerNode.register(context)
  sampler.connect(context.destination)

  return sampler
}
