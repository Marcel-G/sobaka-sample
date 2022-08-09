<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
    pointer-events: none;

    height: 100%;
    width: 100%;
    justify-content: center;
    align-items: center;
  }

  .file-input input {
    display: none;
  }

  .file-input {
    pointer-events: all;
    border: 2px solid var(--module-highlight);
    padding: 0.25rem;
    border-radius: 0.5rem;
    font-family: monospace;
    cursor: pointer;

    transition: border-color 0.25s;
  }

  .file-input:hover {
    border-color: var(--foreground);
  }

  .canvas {
    width: 100%;
    height: 100%;
  }
</style>

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type AudioData = {
    data: Array<number>
    sample_rate: number
  }
</script>

<script lang="ts">
  import { Sampler } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug'

  let canvas: HTMLCanvasElement
  let name = 'sampler'
  const { context, update_sub_state, get_sub_state } = get_module_context()

  const is_array_buffer = (value: unknown): value is ArrayBuffer => {
    return value instanceof ArrayBuffer
  }

  const decode_sample = async (data: ArrayBuffer | null): Promise<AudioData | null> => {
    if (data === null) {
      return null
    }
    const audio_data = await new AudioContext().decodeAudioData(data)
    return {
      data: Array.from(audio_data.getChannelData(0)),
      sample_rate: audio_data.sampleRate
    }
  }

  let sampler_data = get_sub_state(name, {
    audio_data: null as ArrayBuffer | null
  })

  const sampler = new Sampler(context, { audio_data: null }) // @todo make the data all optional
  const loading = sampler.get_address()
  let detections: number[] = []

  $: if (sampler_data?.audio_data && canvas && detections.length) {
    const context = canvas.getContext('2d')!

    const width = canvas.width
    const height = canvas.height

    for (const detection of detections) {
      const x = detection * width

      let fill = context.fillStyle
      context.fillStyle = 'red'
      context.globalAlpha = 0.8
      context.fillRect(x, 0, 1.0, height)
      context.fillStyle = fill
      context.globalAlpha = 1.0
    }
  }

  $: if (sampler_data?.audio_data && canvas) {
    // Update persistent sample data. Clone ArrayBuffer as it will be consumed by the decoding process
    update_sub_state(name, { audio_data: sampler_data.audio_data.slice(0) })

    const width = canvas.width
    const height = canvas.height

    const context = canvas.getContext('2d')!

    // Update data in the audio node
    void decode_sample(sampler_data.audio_data).then(audio_data => {
      void sampler.message({
        UpdateData: audio_data!
      })

      // Draw to canvas  (WIP)
      const step = Math.ceil(audio_data!.data.length / width)
      const amp = height / 2
      for (let i = 0; i < width; i++) {
        let min = 1.0
        let max = -1.0
        for (let j = 0; j < step; j++) {
          const datum = audio_data!.data[i * step + j]
          if (datum < min) min = datum
          if (datum > max) max = datum
        }
        context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp))
      }
    })
  }

  type InputChangeEvent = Event & {
    currentTarget: EventTarget & HTMLInputElement
  }

  function handle_file_load(event: ProgressEvent<FileReader>) {
    const result = event.target?.result
    if (is_array_buffer(result)) {
      sampler_data = { audio_data: result }
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

  void sampler.subscribe('OnDetect', detect => {
    console.log(detect)
    detections = detect
  })

  onDestroy(() => {
    void sampler.dispose()
  })
</script>

<Panel {name} height={8} width={20} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    {#if sampler_data.audio_data}
      <canvas class="canvas" bind:this={canvas} />
    {:else}
      <div class="controls">
        <label class="file-input">
          <input on:change={handle_change} type="file" accept="audio/*" />
          Add Sample
        </label>
      </div>
    {/if}
  {/await}

  <div slot="inputs">
    <Plug id={0} label="Gate" type={PlugType.Input} for_module={sampler} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={sampler} />
  </div>
</Panel>
