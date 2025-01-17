import init, { init_worker, init_worklet } from 'sobaka-dsp'
import worklet_js_url from 'sobaka-dsp/pkg/sobaka-worklet.worklet.js?url&worker'
import worker_js_url from 'sobaka-dsp/pkg/sobaka-worklet.worker.js?url&worker'

export const load = async (ctx: AudioContext) => {
  const handle_interaction = () => {
    void ctx?.resume()
  }
  document?.addEventListener('click', handle_interaction, { once: true })
  await init()

  await init_worklet(ctx, worklet_js_url)
  // https://github.com/vitejs/vite/issues/8470#issuecomment-1147067650
  await init_worker(
    worker_js_url,
    import.meta.env.DEV ? { type: 'module' } : { type: 'classic' }
  )
}
