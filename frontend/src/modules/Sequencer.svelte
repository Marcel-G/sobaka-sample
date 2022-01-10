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
  import { SobakaContext, Sequencer } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import { derived } from 'svelte/store'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'
  import { omit } from 'lodash/fp'
  interface State {
    sequencer: Omit<Sequencer['state'], 'step'>
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    sequencer: { sequence: [true, false, false, false] }
  }

  const sequencer = new Sequencer(context, { step: 0, ...initial_state.sequencer })

  const loading = sequencer.module_id

  modules.register(id, sequencer)

  let state = as_writable(sequencer)

  // Do not persist `step` as it updates automatically
  let persistant_state = derived(state, omit('step'))

  $: modules.update(id, {
    sequencer: $persistant_state
  })

  function extend() {
    state.update(state => ({
      ...state,
      sequence: state.sequence.concat(state.sequence)
    }))
  }

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

<Panel name="sequencer" {id} {position} height={3} width={10}>
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
    <button on:click={extend}> extend </button>
  {/await}
  <div slot="inputs">
    <Plug {id} label="gate" for_input={Sequencer.Input.Gate} />
  </div>

  <div slot="outputs">
    <Plug {id} label="output" />
  </div>
</Panel>
