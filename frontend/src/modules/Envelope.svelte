<script lang="ts">
  import { Envelope, Parameter, SobakaContext } from 'sobaka-sample-audio-worklet'
  import { onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'

  interface State {
    a: Parameter['state']
    d: Parameter['state']
    s: Parameter['state']
    r: Parameter['state']
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    a: { range: [0, 1], value: 0.5 },
    d: { range: [0, 1], value: 0.5 },
    s: { range: [0, 1], value: 0.5 },
    r: { range: [0, 1], value: 0.5 }
  }

  const envelope = new Envelope(context)

  const attack_param = new Parameter(context, initial_state.a)
  const decay_param = new Parameter(context, initial_state.d)
  const sustain_param = new Parameter(context, initial_state.s)
  const release_param = new Parameter(context, initial_state.r)

  const loading = envelope.node_id

  context.link(attack_param, envelope, Envelope.Input.Attack)
  context.link(decay_param, envelope, Envelope.Input.Decay)
  context.link(sustain_param, envelope, Envelope.Input.Sustain)
  context.link(release_param, envelope, Envelope.Input.Release)

  const attack = writable(initial_state.a)
  const decay = writable(initial_state.d)
  const sustain = writable(initial_state.s)
  const release = writable(initial_state.r)

  $: {
    void attack_param.update($attack)
    void decay_param.update($decay)
    void sustain_param.update($sustain)
    void release_param.update($release)

    modules.update(id, {
      a: $attack,
      d: $decay,
      s: $sustain,
      r: $release
    })
  }

  onDestroy(() => {
    void envelope.dispose()
  })
</script>

<Panel name="adsr" {id} {position} height={10} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob bind:value={$attack.value} bind:range={$attack.range} />
    <Knob bind:value={$decay.value} bind:range={$decay.range} />
    <Knob bind:value={$sustain.value} bind:range={$sustain.range} />
    <Knob bind:value={$release.value} bind:range={$release.range} />
  {/await}

  <div slot="inputs">
    <Plug {id} name="gate" for_module={envelope} for_input={Envelope.Input.Gate} />
  </div>

  <div slot="outputs">
    <Plug {id} name="output" for_module={envelope} />
  </div>
</Panel>
