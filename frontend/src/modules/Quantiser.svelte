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

  .key.Cs, .key.Ds, .key.Fs, .key.Gs, .key.As {
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

<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { Quantiser } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'
  import { PlugType } from '../state/plug';

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

  let name = 'quantiser'
  const { context, get_sub_state, update_sub_state } = get_module_context()

  let { notes } = get_sub_state(name, {
    notes: Array(NOTE_LABELS.length).fill(false) as boolean[]
  })

  let selected: number[] = notes.flatMap((val, index) => (val ? [index] : []))

  const quantiser = new Quantiser(context, { notes })

  const loading = quantiser.get_address()

  $: {
    const updated = notes.map((_, index) => selected.includes(index))

    // Update the sobaka node when the state changes
    void quantiser.message({ UpdateNotes: updated })

    // Update the global state when state changes
    update_sub_state(name, { notes: updated })
  }

  onDestroy(() => {
    void quantiser.dispose()
  })
</script>

<Panel name="quantiser" height={8} width={15} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <ul class="board">
      {#each NOTE_LABELS as label, i}
        <li
          class="key {label}"
          class:pressed={notes[i]}
          on:click={() => { notes[i] = !notes[i] }}
        />
      {/each}
    </ul>
  {/await}

  <div slot="inputs">
    <Plug id={0} label="Signal" type={PlugType.Input} for_module={quantiser} />
  </div>

  <div slot="outputs">
    <Plug id={0} label="Output" type={PlugType.Output} for_module={quantiser} />
  </div>
</Panel>