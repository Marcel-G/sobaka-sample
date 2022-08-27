<script context="module" lang="ts">
  import { ModuleTheme } from '../../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = Readonly<{
    sound_id: string | null
    threshold: number
  }>

  export const initialState: State = {
    sound_id: null,
    threshold: 0.5
  }
</script>

<script lang="ts">
  import { debounce } from 'lodash'
  import type { Sampler } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import { into_style } from '../../components/Theme.svelte'
  import { PlugType } from '../../workspace/plugs'
  import Knob from '../../components/Knob.svelte'
  import { SubStore } from '../../utils/patches'
  import { get_audio_context } from '../../routes/workspace/[slug]/+layout.svelte'
  import type { Command } from 'sobaka-sample-audio-worklet/dist/src/main/abstractModule'
  import { load_audio, store_audio } from '../../worker/media'
  import { init_canvas } from './render'

  export let state: SubStore<State>
  let name = 'sampler'
  let sampler: Sampler
  let loading = true

  const context = get_audio_context()
  const canvas = init_canvas()

  onMount(async () => {
    const { Sampler } = await import('sobaka-sample-audio-worklet')
    sampler = new Sampler($context, {
      threshold: $threshold,
      audio_data: null
    })
    await sampler.get_address()
    loading = false

    sampler.subscribe('OnDetect', canvas.update_detections)
    sampler.subscribe('OnTrigger', canvas.update_active)
  })

  let mountpoint: HTMLElement
  $: if (mountpoint) canvas.mount(mountpoint)

  type InputChangeEvent = Event & {
    currentTarget: EventTarget & HTMLInputElement
  }

  async function handle_change(event: InputChangeEvent) {
    const file = event.currentTarget.files?.[0]

    if (file) {
      $sound_id = await store_audio(file)
      loading = true
    }
  }

  const debounced_message = debounce((message: Command<'Sampler'>) => {
    sampler?.message(message)
  }, 250)

  const threshold = state.select(s => s.threshold)
  const sound_id = state.select(s => s.sound_id)

  // Update the sobaka node when the state changes
  $: void debounced_message({ SetThreshold: $threshold })

  sound_id.subscribe(async id => {
    if (id) {
      const audio_data = await load_audio(id)

      canvas.update_wave(audio_data)

      // Send updated data to audio worklet - @todo this may not be the most efficient format
      sampler?.message({ UpdateData: audio_data })
      loading = false
    }
  })

  onDestroy(() => {
    void sampler?.dispose()
    canvas.cleanup()
  })
</script>

<Panel {name} height={8} width={30} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else if $sound_id}
    <div class="sampler-controls">
      <div class="wave" bind:this={mountpoint} />
      <Knob bind:value={$threshold} range={[0, 100]} label="threshold" />
    </div>
  {:else}
    <div class="controls">
      <label class="file-input">
        <input on:change={handle_change} type="file" accept="audio/*" />
        Add Sample
      </label>
    </div>
  {/if}

  <div slot="inputs">
    <Plug id={0} label="Gate" type={PlugType.Input} for_module={sampler} />
  </div>
  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={sampler} />
  </div>
</Panel>

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

  .sampler-controls {
    display: flex;
    width: 100%;
    height: 100%;
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

  .wave {
    flex: 1 1 100%;
  }
</style>
