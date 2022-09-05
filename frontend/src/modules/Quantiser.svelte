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

  type State = Readonly<{
    notes: boolean[]
  }>
  export const initialState: State = {
    notes: Array(NOTE_LABELS.length).fill(false)
  }
</script>

<script lang="ts">
  import type { Draft } from 'immer'
  import type { Quantiser } from 'sobaka-sample-audio-worklet'
  import { onDestroy, onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../workspace/plugs'
  import { get_context as get_audio_context } from '../audio'
  import type { SubStore } from 'src/utils/patches'

  export let state: SubStore<State>
  let name = 'quantiser'
  let quantiser: Quantiser
  let loading = true

  const context = get_audio_context()

  onMount(async () => {
    const { Quantiser } = await import('sobaka-sample-audio-worklet')
    quantiser = new Quantiser($context, $state)
    await quantiser.get_address()
    loading = false
  })

  const notes = state.select(s => s.notes)

  // Update the sobaka node when the state changes
  $: void quantiser?.message({ UpdateNotes: $notes })

  function on_toggle(index: number) {
    return () => {
      state.update((s: Draft<State>) => {
        s.notes[index] = !s.notes[index]
        return s
      })
    }
  }

  onDestroy(() => {
    void quantiser?.dispose()
  })
</script>

<Panel {name} height={8} width={15} custom_style={into_style(theme)}>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <ul class="board">
      {#each NOTE_LABELS as label, i}
        <li class="key {label}" class:pressed={$notes[i]} on:click={on_toggle(i)} />
      {/each}
    </ul>
  {/if}

  <div slot="inputs">
    <Plug id={0} label="Signal_1" type={PlugType.Input} for_module={quantiser} />
    <!-- @todo polyphony
      <Plug id={1} label="Signal_2" type={PlugType.Input} for_module={quantiser} />
      <Plug id={2} label="Signal_3" type={PlugType.Input} for_module={quantiser} />
      <Plug id={3} label="Signal_4" type={PlugType.Input} for_module={quantiser} />
    -->
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output_1" type={PlugType.Output} for_module={quantiser} />
    <!-- @todo polyphony
      <Plug id={1} label="Output_2" type={PlugType.Output} for_module={quantiser} />
      <Plug id={2} label="Output_3" type={PlugType.Output} for_module={quantiser} />
      <Plug id={3} label="Output_4" type={PlugType.Output} for_module={quantiser} />
    -->
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
