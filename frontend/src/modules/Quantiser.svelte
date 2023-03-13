<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }

  const NOTE_LABELS = [
    'C',
    'Cs',
    'D',
    'Ds',
    'E',
    'F',
    'Fs',
    'G',
    'Gs',
    'A',
    'As',
    'B'
  ] as const

  type State = {
    notes: { value: boolean }[]
  }
  export const initialState: State = {
    notes: Array(NOTE_LABELS.length).fill({ value: false })
  }
</script>

<script lang="ts">
  import type { Quantiser } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'
  import { Tuple } from '../@types'

  export let state: State
  let name = 'quantiser'
  let quantiser: Quantiser
  let node: AudioNode
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Quantiser } = await import('sobaka-dsp')
    quantiser = await Quantiser.create($context)
    node = quantiser.node()
    loading = false
  })

  // Update the sobaka node when the state changes
  $: notes = state.notes // @todo this may not update
  $: quantiser?.command({
    UpdateNotes: notes.map(({ value }) => value) as Tuple<boolean, 12>
  })

  function on_toggle(index: number) {
    state.notes[index].value = !state.notes[index].value
  }

  onDestroy(() => {
    quantiser?.destroy()
    quantiser?.free()
  })
</script>

<Panel {name} height={8} width={15} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <ul class="board">
      {#each NOTE_LABELS as label, i}
        <li
          class="key {label}"
          class:pressed={state.notes[i].value}
          on:click={() => on_toggle(i)}
        />
      {/each}
    </ul>
  {/if}

  <div slot="inputs">
    <Plug
      id={0}
      label="Signal_1"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>

  <div slot="outputs">
    <Plug
      id={0}
      label="Output_1"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>

<!-- @todo fix minor key z-index -->
<style>
  .board {
    display: flex;
    flex-direction: row;
    height: 100%;
  }

  .key {
    cursor: pointer;
    background-color: white;
    border: 1px solid black;
    flex-grow: 1;
    border-radius: 0px 0px 2px 2px;
  }
  .key:not(:last-child) {
    border-width: 1px 0 1px 1px;
  }

  .key.Cs,
  .key.Ds,
  .key.Fs,
  .key.Gs,
  .key.As {
    background-color: black;
    height: 55%;
    flex: 0 0 0.75rem;
    margin: 0 calc(-0.75rem / 2);
    z-index: 1;
    border-width: 1px;
  }

  .key:hover {
    background-color: #f0f0f0;
  }

  .key.pressed {
    background-color: var(--module-highlight);
  }

  li {
    margin: 0;
    padding: 0;
    list-style: none;
    position: relative;
    float: left;
  }
</style>
