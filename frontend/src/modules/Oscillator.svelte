<script lang="ts">
  import {
    Input,
    Oscillator,
    OscillatorState,
    OscillatorWave,
    Parameter,
    SamplerNode
  } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import { Writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    frequency: { range: [number, number]; value: number }
    oscillator: OscillatorState
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SamplerNode
  export let initial_state: State = {
    frequency: { range: [20, 10000], value: 60 },
    oscillator: { wave: OscillatorWave.Sine }
  }

  const oscillator = new Oscillator(context)
  const frequency_param = new Parameter(context)

  let output_node: Writable<Element>

  const loading = Promise.all([
    oscillator.create(initial_state.oscillator),
    frequency_param.create(initial_state.frequency)
  ]).then(async ([oscillator_id, frequency_id]) => {
    modules.register(id, {
      module_id: oscillator_id,
      output_node: output_node,
      input_nodes: {}
    })

    await context.client.request({
      // @todo move to binding lib
      method: 'module/connect',
      params: [frequency_id, oscillator_id, { Oscillator: Input.Frequency }]
    })
  })

  const frequency = as_writable(frequency_param, initial_state.frequency)
  const oscillator_state = as_writable(oscillator, initial_state.oscillator)

  $: modules.update(id, {
    frequency: $frequency,
    oscillator: $oscillator_state
  })

  function change_wave(wave: OscillatorWave) {
    oscillator_state.set({ wave })
  }

  onDestroy(() => {
    void oscillator.dispose()
  })
</script>

<Panel name="oscillator" {id} {position} height={7} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob label="Frequency" bind:value={$frequency.value} bind:range={$frequency.range} />
    <button on:click={() => change_wave(OscillatorWave.Sine)}>Sine</button>
    <button on:click={() => change_wave(OscillatorWave.Saw)}>Saw</button>
    <button on:click={() => change_wave(OscillatorWave.Square)}>Square</button>
    <button on:click={() => change_wave(OscillatorWave.Noise)}>Noise</button>
    <p>wave: {$oscillator_state?.wave}</p>
  {/await}
  <div slot="outputs">
    <Plug {id} label="output" bind:el={output_node} />
  </div>
</Panel>