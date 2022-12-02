import type { Writable } from 'svelte/store'
import { writable } from '@crikey/stores-immer'
import { getContext, setContext } from 'svelte'
import init from 'sobaka-sample-audio-worklet/dist/pkg'

const AUDIO_CONTEXT = 'AUDIO_CONTEXT'

export const init_audio = () => {
  let context: AudioContext

  const audio_context: Writable<AudioContext | null> = writable(null)
  setContext(AUDIO_CONTEXT, audio_context)

  // Wait for some interaction on the page before starting the audio
  const handle_interaction = () => {
    void context?.resume()
  }

  document.addEventListener('click', handle_interaction, { once: true })

  const load = async () => {
    await init()
    context = new AudioContext()

    audio_context.update(s => {
      s = context
      return s
    })
  }

  const cleanup = () => {
    document.removeEventListener('click', handle_interaction)
    // void sobaka?.destroy()
    void context?.close()
  }

  return {
    load,
    cleanup
  }
}

export const get_context = () => getContext<Writable<AudioContext>>(AUDIO_CONTEXT)
