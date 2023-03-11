<script context="module" lang="ts">
  import { ModuleTheme } from '../../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = Readonly<{
    sound_id: string | null
    threshold: number
    active_segment: number
    view_position: number
    playback_rate: number
  }>

  export const initialState: State = {
    sound_id: null,
    threshold: 45,
    active_segment: 0,
    view_position: 0,
    playback_rate: 1.0
  }
</script>

<script lang="ts">
  import { SharedAudio, SamplerController } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import { into_style } from '../../components/Theme.svelte'
  import { PlugType } from '../../workspace/plugs'
  import Knob from '../../components/Knob.svelte'
  import { getMediaManager, get_context as get_audio_context } from '../../audio'
  import { into_transport, list_audio, load_audio, store_audio } from '../../worker/media'
  import AudioPreview from './AudioPreview.svelte'
  import AudioDetail from './AudioDetail.svelte'
  import Button from '../../components/Button.svelte'

  export let state: State
  let name = 'sampler'
  let sampler: SamplerController
  let node: AudioNode
  let loading = true
  let rate_param: AudioParam
  let files: {
    name: string
    id: string
  }[] = []

  const context = get_audio_context()

  let trigger_segment: (segment_index: number) => void
  let audio_data: SharedAudio | null
  let detections: number[] = []

  onMount(async () => {
    const { SamplerController } = await import('sobaka-dsp')
    sampler = await SamplerController.create($context)

    node = sampler.node()
    loading = false

    rate_param = sampler.get_param('Rate')

    sampler.subscribe(event => {
      if ('OnTrigger' in event) {
        trigger_segment(event.OnTrigger)
      } else if ('OnDetect' in event) {
        detections = event.OnDetect
      }
    })

    files = await list_audio()
  })

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

  const threshold = state.select(s => s.threshold)
  const sound_id = state.select(s => s.sound_id)
  const view_position = state.select(s => s.view_position)
  const playback_rate = state.select(s => s.playback_rate)
  const active_segment = state.select(s => s.active_segment)

  // Update the sobaka node when the state changes
  $: sampler?.set_threshold($threshold)

  sound_id.subscribe(async id => {
    if (id) {
      const audio = await getMediaManager().load_with(id, async () =>
        load_audio(id).then(into_transport)
      )

      audio_data = audio.cloned()

      if (audio) {
        // Send updated data to audio worklet - @todo this may not be the most efficient format
        setTimeout(() => {
          sampler?.update_audio(audio)
        }, 1000)
      }
      loading = false
    }
  })

  const handle_view_change = (position: number) => {
    $view_position = position
  }

  const handle_segment_click = (segment_index: number) => {
    $active_segment = segment_index
  }

  // Update the sobaka node when the state changes
  $: rate_param?.setValueAtTime($playback_rate, $context.currentTime)
  $: sampler?.command({ SetSample: $active_segment })

  onDestroy(() => {
    sampler?.destroy()
    sampler?.free()
  })
</script>

<Panel {name} height={20} width={20} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else if $sound_id}
    <div class="sampler-controls">
      {#if audio_data}
        <AudioPreview
          view_position={$view_position}
          {audio_data}
          on_view_change={handle_view_change}
        />
        <AudioDetail
          active_segment={$active_segment}
          view_position={$view_position}
          {audio_data}
          segments={detections}
          playback_rate={$playback_rate}
          on_segment_click={handle_segment_click}
          bind:trigger_segment
        />
        <div class="controls">
          <Knob bind:value={$playback_rate} range={[0.1, 4]} label="rate">
            <div slot="inputs">
              <Plug
                id={1}
                label="rate_cv"
                ctx={{ type: PlugType.Param, param: rate_param }}
              />
            </div>
          </Knob>
          <Knob bind:value={$threshold} range={[0.5, 100]} label="threshold" />
          <!-- Lol need a better button -->
          <Button
            onClick={() => {
              $sound_id = null
            }}>Change</Button
          >
        </div>
      {/if}
    </div>
  {:else}
    <div class="file-selector">
      <label class="file-input">
        <input on:change={handle_change} type="file" accept="audio/*" />
        Add Sample
      </label>
      <ol>
        {#each files as file (file.id)}
          <li
            on:click={() => {
              $sound_id = file.id
            }}
          >
            {file.name}
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      label="Gate"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      label="Output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-auto-flow: column;
    align-items: stretch;
    pointer-events: none;

    justify-content: left;
  }

  .file-selector {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .file-selector ol {
    list-style-type: none;
    overflow-y: scroll;
  }

  .file-selector li {
    cursor: pointer;
    padding: 0.5rem;
    background-color: var(--current-line);
    border-radius: 0.5rem;
    margin: 0.25rem 0;

    font-family: monospace;

    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .file-selector li:hover {
    background-color: var(--comment);
  }

  .sampler-controls {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    cursor: default;
  }

  .file-input input {
    display: none;
  }

  .file-input {
    pointer-events: all;
    border: 2px solid var(--module-highlight);
    padding: 0.5rem;
    margin: 0.25rem 0;
    border-radius: 0.5rem;
    font-family: monospace;
    cursor: pointer;

    transition: border-color 0.25s;
  }

  .file-input:hover {
    border-color: var(--foreground);
  }
</style>
