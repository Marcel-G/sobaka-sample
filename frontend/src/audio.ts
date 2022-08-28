import type { Writable } from 'svelte/store'
import { writable } from '@crikey/stores-immer'
import type { SobakaContext } from 'sobaka-sample-audio-worklet'
import { getContext, setContext } from 'svelte'

const AUDIO_CONTEXT = 'AUDIO_CONTEXT'

export const init_audio = () => {
  let context: AudioContext
  let sobaka: SobakaContext

  const audio_context: Writable<SobakaContext | null> = writable(null)
  setContext(AUDIO_CONTEXT, audio_context)

  // Wait for some interaction on the page before starting the audio
  const handle_interaction = () => {
    void context?.resume()
  }

  document.addEventListener('click', handle_interaction, { once: true })

  const load = async () => {
    context = new AudioContext()

    const { SobakaContext } = await import('sobaka-sample-audio-worklet')

    sobaka = await SobakaContext.register(context)
    sobaka.connect(context.destination)

    audio_context.update(s => {
      s = sobaka
      return s
    })
  }

  const cleanup = () => {
    document.removeEventListener('click', handle_interaction)
    void sobaka?.destroy()
    void context?.close()
  }

  return {
    load,
    cleanup
  }
}

export const get_context = () => getContext<Writable<SobakaContext>>(AUDIO_CONTEXT)
