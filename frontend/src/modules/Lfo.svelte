<script context="module" lang="ts">
  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import RingSpinner from '../components/RingSpinner.svelte'
  import { create_bpm_range } from '../range/range_creators'
  import { getGlobalCtx } from '../context/global'
  import { PlugType } from '../models/workspace'

  export let state: State
  export let disabled = false
  let name = 'lfo'
  let lfo: OscillatorNode
  let loading = true

  const context = getGlobalCtx()

  // @todo -- make this work with volt per octave
  const lfo_range = create_bpm_range(0, 600)

  onMount(async () => {
    lfo = new OscillatorNode(context.audio, { type: 'sine' })

    loading = false

    lfo.start()
  })

  // Update the sobaka node when the state changes
  $: lfo?.frequency.setValueAtTime((state.bpm || 0) / 60, context.audio.currentTime)
</script>

<Panel
  {name}
  {disabled}
  height={6}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <Knob {disabled} bind:value={state.bpm} range={lfo_range} label="bpm">
      <!-- <div slot="inputs">
        <Plug
          id={1}
          label="bpm_cv"
          ctx={{ type: PlugType.Param, param: lfo?.frequency }}
        />
      </div> -->
    </Knob>
  {/if}
  <!-- @todo can't do reset with OscillatorNode?
  <div slot="inputs">
    <Plug id={0} label="reset" ctx={{ type: PlugType.Input, connectIndex: 0, module: lfo }} />
  </div> -->

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="signal"
      ctx={{ type: PlugType.Output, connectIndex: 0, module: lfo }}
    />
  </div>
</Panel>
