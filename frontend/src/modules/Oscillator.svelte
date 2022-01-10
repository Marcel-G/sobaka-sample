<script lang="ts">
  import {
    Oscillator,
    OscillatorWave,
    Parameter,
    SobakaContext
  } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    frequency: Parameter['state']
    oscillator: Oscillator['state']
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    frequency: { range: [20, 10000], value: 60 },
    oscillator: { wave: Oscillator.Wave.Sine }
  }

  const oscillator = new Oscillator(context, initial_state.oscillator)
  const frequency_param = new Parameter(context, initial_state.frequency)

  const loading = oscillator.module_id

  modules.register(id, oscillator)
  context.link(frequency_param, oscillator, Oscillator.Input.Frequency)

  const frequency = as_writable(frequency_param)
  const oscillator_state = as_writable(oscillator)

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
    <button on:click={() => change_wave(Oscillator.Wave.Sine)}>Sine</button>
    <button on:click={() => change_wave(Oscillator.Wave.Saw)}>Saw</button>
    <button on:click={() => change_wave(Oscillator.Wave.Square)}>Square</button>
    <button on:click={() => change_wave(Oscillator.Wave.Noise)}>Noise</button>
    <p>wave: {$oscillator_state?.wave}</p>
  {/await}
  <div slot="outputs">
    <Plug {id} label="output" />
  </div>
</Panel>
