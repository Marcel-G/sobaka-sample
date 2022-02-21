<script lang="ts">
  import { HACKInput } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import Plug from './shared/Plug.svelte'

  const { context } = get_module_context()

  let cleanup_input_device: () => void
  let supported: boolean

  const input = new HACKInput(context)

  if (navigator.mediaDevices) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        const { context: web_audio_context } = context
        const input_device = (web_audio_context as AudioContext).createMediaStreamSource(
          stream
        )
        input_device.connect(context)
        cleanup_input_device = () => {
          stream.getTracks().forEach(track => track.stop())
        }

        supported = true
      })
      .catch(err => {
        console.error(err)
      })
  }

  const loading = input.node_id

  onDestroy(() => {
    cleanup_input_device?.()
    void input.dispose()
  })
</script>

<Panel name="input" height={2} width={2}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    {supported ? '🎙' : '🚫'}
  {/await}

  <div slot="outputs">
    {#if supported}
      <Plug for_node={input} />
    {/if}
  </div>
</Panel>
