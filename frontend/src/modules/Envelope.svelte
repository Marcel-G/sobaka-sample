<script lang="ts">
  import {
    Envelope,
    EnvelopeInput,
    Parameter,
    SamplerNode
  } from 'sobaka-sample-web-audio'
  import { onDestroy } from 'svelte'
  import type { Writable } from 'svelte/store'
  import Knob from '../components/Knob.svelte'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import { as_writable } from '../writable_module'

  interface State {
    a: { range: [number, number]; value: number }
    d: { range: [number, number]; value: number }
    s: { range: [number, number]; value: number }
    r: { range: [number, number]; value: number }
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SamplerNode
  export let initial_state: State = {
    a: { range: [0, 1], value: 0.5 },
    d: { range: [0, 1], value: 0.5 },
    s: { range: [0, 1], value: 0.5 },
    r: { range: [0, 1], value: 0.5 }
  }

  const gate_input_type = { Envelope: EnvelopeInput.Gate }

  const envelope = new Envelope(context)

  const attack_param = new Parameter(context)
  const decay_param = new Parameter(context)
  const sustain_param = new Parameter(context)
  const release_param = new Parameter(context)

  let gate_node: Writable<Element>
  let output_node: Writable<Element>

  const loading = Promise.all([
    envelope.create(),
    attack_param.create(initial_state.a),
    decay_param.create(initial_state.d),
    sustain_param.create(initial_state.s),
    release_param.create(initial_state.r)
  ]).then(async ([envelope_id, attack_id, decay_id, sustain_id, release_id]) => {
    modules.register(id, {
      module_id: envelope_id,
      output_node: output_node,
      input_nodes: {
        [JSON.stringify(gate_input_type)]: gate_node
      }
    })

    await context.client.request({
      // @todo move to binding lib
      method: 'module/connect',
      params: [attack_id, envelope_id, { Envelope: EnvelopeInput.Attack }]
    })

    await context.client.request({
      // @todo move to binding lib
      method: 'module/connect',
      params: [decay_id, envelope_id, { Envelope: EnvelopeInput.Decay }]
    })

    await context.client.request({
      // @todo move to binding lib
      method: 'module/connect',
      params: [sustain_id, envelope_id, { Envelope: EnvelopeInput.Sustain }]
    })

    await context.client.request({
      // @todo move to binding lib
      method: 'module/connect',
      params: [release_id, envelope_id, { Envelope: EnvelopeInput.Release }]
    })
  })

  const attack = as_writable(attack_param, initial_state.a)
  const decay = as_writable(decay_param, initial_state.d)
  const sustain = as_writable(sustain_param, initial_state.s)
  const release = as_writable(release_param, initial_state.r)

  $: modules.update(id, {
    a: $attack,
    d: $decay,
    s: $sustain,
    r: $release
  })

  onDestroy(() => {
    void envelope.dispose()
  })
</script>

<Panel name="adsr" {id} {position} height={10} width={3}>
  {#await loading}
    <p>Loading...</p>
  {:then}
    <Knob label="Attack" bind:value={$attack.value} bind:range={$attack.range} />
    <Knob label="Decay" bind:value={$decay.value} bind:range={$decay.range} />
    <Knob label="Sustain" bind:value={$sustain.value} bind:range={$sustain.range} />
    <Knob label="Release" bind:value={$release.value} bind:range={$release.range} />
  {/await}

  <div slot="inputs">
    <Plug {id} label="gate" to_type={gate_input_type} bind:el={gate_node} />
  </div>

  <div slot="outputs">
    <Plug {id} label="output" bind:el={output_node} />
  </div>
</Panel>
