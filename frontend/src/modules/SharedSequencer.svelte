<style>
  .sequence {
    display: flex;
    justify-content: space-between;
    row-gap: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .step {
    height: 1.5rem;
    width: 1.5rem;
    border: 2px solid black;
    cursor: pointer;
    border-radius: 0.5rem;
  }
  .step.active {
    background-color: pink;
  }

  .step.active.selected {
    background-color: red;
  }

  .step.selected {
    background-color: gainsboro;
  }
</style>

<script context="module" lang="ts">
  export type SequencerLayout = Omit<Sequencer['state'], 'step'>
</script>

<script lang="ts">
  import { Sequencer } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { get_module_context } from './ModuleWrapper.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  export let name: string
  export let sequencer_state: SequencerLayout = {
    sequence: Array(8).fill(false) as boolean[]
  }
  export let on_mount: (sequencer: Sequencer) => void

  let active_step = 0
  let { sequence } = get_sub_state<SequencerLayout>(name) || sequencer_state

  const sequencer = new Sequencer(context, { step: 0, sequence })
  on_mount(sequencer)

  void sequencer.subscribe('StepChange', event => {
    active_step = event.step
  })

  // Update the sobaka node when the state changes
  $: void sequencer.update({ step: active_step, sequence })

  // Update the global state when state changes
  $: update_sub_state(name, { sequence })

  function toggle_index(i: number) {
    sequence = sequence.map((step, index) => (i === index ? !step : step))
  }

  const loading = sequencer.node_id

  onDestroy(() => {
    void sequencer.dispose()
  })
</script>

{#await loading}
  <p>Loading...</p>
{:then}
  <div class="sequence">
    {#each sequence as step, i}
      <div
        class="step"
        class:selected={step}
        class:active={i === active_step}
        on:click={() => toggle_index(i)}
      />
    {/each}
  </div>
{/await}
