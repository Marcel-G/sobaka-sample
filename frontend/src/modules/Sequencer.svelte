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
  import {
    SamplerNode,
    Sequencer,
    SequencerInput,
    SequencerState
  } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import { derived, Writable } from 'svelte/store'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'
  interface State {
    sequencer: Omit<SequencerState, 'step'>
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SamplerNode
  export let initial_state: State = {
    sequencer: { sequence: [true, false, false, false] }
  }

  const gate_input_type = { Sequencer: SequencerInput.Gate }

  const sequencer = new Sequencer(context)
  const loading = sequencer.create({ step: 0, ...initial_state.sequencer })

  let output_node: Writable<Element>
  let gate_node: Writable<Element>

  void loading.then(module_id =>
    modules.register(id, {
      module_id: module_id,
      output_node: output_node,
      input_nodes: {
        [JSON.stringify(gate_input_type)]: gate_node
      }
    })
  )

  let state = as_writable(sequencer, { step: 0, ...initial_state.sequencer })

  // Do not persist `step` as it updates automatically
  // @todo use omit
  let persistant_state = derived(state, ({ step, ...state }) => state)

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
  {#if $state}
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
  {:else}
    <p>Loading...</p>
  {/if}
  <div slot="inputs">
    <Plug {id} label="gate" to_type={gate_input_type} bind:el={gate_node} />
  </div>

  <div slot="outputs">
    <Plug {id} label="output" bind:el={output_node} />
  </div>
</Panel>
