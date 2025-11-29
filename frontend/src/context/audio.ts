import init, { registerContext } from 'sobaka-dsp'

export const load = async (ctx: AudioContext) => {
  const handle_interaction = () => {
    if (ctx.state === 'suspended') {
      void ctx?.resume()
    }
  }
  document?.addEventListener('click', handle_interaction, { once: true })
  await init()

  await registerContext(ctx)
}
