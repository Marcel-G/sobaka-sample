<script lang="ts">
  import { Sampler } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import CvParameter from './shared/CvParameter.svelte'

  const { context, update_sub_state, get_sub_state } = get_module_context()

  let sampler_data: { data: ArrayBuffer } | undefined = get_sub_state('sampler')

  const sampler = new Sampler(context, { sample_rate: 0, data: null }) // @todo make the data all optional
  let loading = sampler.node_id

  const is_array_buffer = (value: unknown): value is ArrayBuffer => {
    return value instanceof ArrayBuffer
  }

  type Sample = {
    data: Float32Array
    sample_rate: number
  }

  async function decode_sample(data: ArrayBuffer): Promise<Sample> {
    const audio_data = await new AudioContext().decodeAudioData(data)
    return {
      data: audio_data.getChannelData(0),
      sample_rate: audio_data.sampleRate
    }
  }

  $: if (sampler_data?.data) {
    // Update persistent sample data. Clone ArrayBuffer as it will be consumed by the decoding process
    update_sub_state('sampler', { data: sampler_data.data.slice(0) })

    // Update data in the audio node
    void decode_sample(sampler_data?.data).then(sample => {
      sampler.update({
        data: Array.from(sample.data),
        sample_rate: sample.sample_rate
      })
    })
  }

  type InputChangeEvent = Event & {
    currentTarget: EventTarget & HTMLInputElement
  }

  function handle_file_load(event: ProgressEvent<FileReader>) {
    const result = event.target?.result
    if (is_array_buffer(result)) {
      sampler_data = { data: result }
    }
  }

  function handle_change(event: InputChangeEvent) {
    const file = event.currentTarget.files?.[0]

    if (file) {
      const reader = new FileReader()
      reader.addEventListener('load', handle_file_load)
      reader.readAsArrayBuffer(file)
    }
  }

  onDestroy(() => {
    void sampler.dispose()
  })
</script>

<Panel name="sampler" height={8} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <CvParameter
      for_node={sampler}
      for_input={'Start'}
      default_value={0}
      default_range={[0, 1]}
    />
    <CvParameter
      for_node={sampler}
      for_input={'Length'}
      default_value={1}
      default_range={[0, 1]}
    />
    <CvParameter
      for_node={sampler}
      for_input={'Speed'}
      default_value={1}
      default_range={[0, 10]}
    />
    <input on:change={handle_change} type="file" accept="audio/*" />
  {/await}

  <div slot="inputs">
    <Plug for_node={sampler} for_input={'Gate'} />
  </div>
  <div slot="outputs">
    <Plug for_node={sampler} />
  </div>
</Panel>
