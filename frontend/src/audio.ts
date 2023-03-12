import { writable, Writable } from 'svelte/store'
import { getContext, setContext } from 'svelte'
import init, { init_worker, init_worklet } from 'sobaka-dsp'
import worklet_js_url from 'sobaka-dsp/pkg/sobaka-worklet.worklet.js?url&worker'
import worker_js_url from 'sobaka-dsp/pkg/sobaka-worklet.worker.js?url&worker'

const AUDIO_CONTEXT = 'AUDIO_CONTEXT'

export const init_audio = () => {
  let context: AudioContext

  const audio_context: Writable<AudioContext | null> = writable(null)
  setContext(AUDIO_CONTEXT, audio_context)

  // Wait for some interaction on the page before starting the audio
  const handle_interaction = () => {
    void context?.resume()
  }

  const load = async () => {
    document?.addEventListener('click', handle_interaction, { once: true })
    await init()
    context = new AudioContext()
    await init_worklet(context, worklet_js_url)
    // https://github.com/vitejs/vite/issues/8470#issuecomment-1147067650
    await init_worker(
      worker_js_url,
      import.meta.env.DEV ? { type: 'module' } : { type: 'classic' }
    )

    audio_context.update(s => {
      s = context
      return s
    })
  }

  const cleanup = () => {
    document?.removeEventListener('click', handle_interaction)
    void context?.close()
  }

  return {
    load,
    cleanup
  }
}

export const get_context = () => getContext<Writable<AudioContext>>(AUDIO_CONTEXT)
