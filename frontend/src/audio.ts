import { writable, Writable } from 'svelte/store'
import { getContext, setContext } from 'svelte'
import init, { init_worker, init_worklet } from 'sobaka-dsp'
import worklet_js_url from 'sobaka-dsp/pkg/sobaka-worklet.worklet.js?url&worker'
import worker_js_url from 'sobaka-dsp/pkg/sobaka-worklet.worker.js?url&worker'
import { SobakaMediaManager } from './models/MediaManager'
import { get_storage } from './worker/storage'

const AUDIO_CONTEXT = 'AUDIO_CONTEXT'

export type Context = {
  audio: AudioContext
  media: SobakaMediaManager
}

export const init_audio = () => {
  let context: Context

  const audio_context: Writable<Context | null> = writable(null)
  setContext(AUDIO_CONTEXT, audio_context)

  // Wait for some interaction on the page before starting the audio

  const load = async () => {
    await init()
    const audio = new AudioContext()

    document?.addEventListener('click', () => {
      // Wait for some interaction on the page before starting the audio
      audio.resume()
    }, { once: true })

    await init_worklet(audio, worklet_js_url)
    // https://github.com/vitejs/vite/issues/8470#issuecomment-1147067650
    await init_worker(
      worker_js_url,
      import.meta.env.DEV ? { type: 'module' } : { type: 'classic' }
    )

    const storage = await get_storage()
    const media = new SobakaMediaManager(storage)

    audio_context.update(s => {
      s = {
        audio,
        media
      }
      return s
    })
  }

  const cleanup = () => {
    void context.audio.close()
  }

  return {
    load,
    cleanup
  }
}

export const get_context = () => getContext<Writable<Context>>(AUDIO_CONTEXT)
