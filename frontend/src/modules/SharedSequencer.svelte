<style>
  .sequence {
    display: flex;
    justify-content: center;
  }

  .step {
    height: 2rem;
    width: 2rem;
    border: 1px solid black;
    cursor: pointer;
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

<script lang="ts">
  import { merge, __ as _ } from 'lodash/fp'

  import { SobakaContext, Sequencer } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import type { Writable } from 'svelte/store'

  export let context: SobakaContext
  export let state: Writable<Sequencer['state']>
  export let on_mount: (sequencer: Sequencer) => void

  const sequencer = new Sequencer(context, get(state))
  on_mount(sequencer)

  const loading = sequencer.node_id

  void sequencer.subscribe('StepChange', event => {
    state.update(merge(_, event))
  })

  $: void sequencer.update($state)

  function toggle_index(i: number) {
    state.update(state => ({
      ...state,
      sequence: state.sequence.map((step, index) => (i === index ? !step : step))
    }))
  }

  onDestroy(() => {
    void sequencer.dispose()
  })
</script>

{#await loading}
  <p>Loading...</p>
{:then}
  <div class="sequence">
    {#each $state.sequence as step, i}
      <div
        class="step"
        class:selected={step}
        class:active={i === $state.step}
        on:click={() => toggle_index(i)}
      />
    {/each}
  </div>
{/await}
