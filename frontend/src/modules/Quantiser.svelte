<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto auto;
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

  const NOTE_LABELS = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B'
  ] as const

  let name = 'quantiser'
  const { context, get_sub_state, update_sub_state } = get_module_context()

  let { notes } = get_sub_state<Quantiser['state']>(name) || {
    notes: Array(NOTE_LABELS.length).fill(false) as boolean[]
  }
  let selected: number[] = notes.flatMap((val, index) => (val ? [index] : []))

  const quantiser = new Quantiser(context, { notes })

  const loading = quantiser.node_id

  $: {
    const updated = notes.map((_, index) => selected.includes(index))

    // Update the sobaka node when the state changes
    void quantiser.update({ notes: updated })

    // Update the global state when state changes
    update_sub_state(name, { notes: updated })
  }

  onDestroy(() => {
    void quantiser.dispose()
  })
</script>

<Panel name="quantiser" height={8} width={10} custom_style={into_style(theme)}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <div class="controls">
      {#each NOTE_LABELS as label, i}
        <label>
          <input type="checkbox" bind:group={selected} value={i} />
          {label}
        </label>
      {/each}
    </div>
  {/await}

  <div slot="inputs">
    <Plug for_node={quantiser} for_input={'Pitch'} />
  </div>

  <div slot="outputs">
    <Plug for_node={quantiser} />
  </div>
</Panel>
