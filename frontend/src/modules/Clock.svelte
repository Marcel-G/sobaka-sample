<script context="module" lang="ts">
  import type { ModuleTheme } from './ThemeProvider.svelte'
  export const theme: Partial<ModuleTheme> = {
    primary: 'pink'
  }

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
  import { Clock } from 'sobaka-dsp'
  import { getGlobalCtx } from '../context/global'
  import { PlugType } from '../models/workspace'

  export let state: State
  export let disabled = false
  let clock: Clock
  let name = 'clock'
  let bpm_param: AudioParam
  let node: AudioNode
  let loading = true

  const context = getGlobalCtx()

  // @todo -- make this work with volt per octave
  const bpm = create_bpm_range()

  onMount(async () => {
    clock = await Clock.create(context.audio)
    node = clock.node()
    bpm_param = clock.get_param('Bpm')

    loading = false
  })

  $: bpm_param?.setValueAtTime(state.bpm, context.audio.currentTime)
</script>

<Panel {name} height={8} width={5} {disabled} {theme}>
  <Layout type="center">
    {#if loading}
      <RingSpinner color="blue" size="sm" />
    {:else}
      <Knob {disabled} bind:value={state.bpm} range={bpm} label="bpm">
        <div slot="knob-inputs">
          <Plug
            id={0}
            {disabled}
            label="bpm_cv"
            ctx={{ type: PlugType.Param, param: bpm_param }}
          />
        </div>
      </Knob>
    {/if}
  </Layout>

  <div slot="outputs">
    <Plug
      id={0}
      {disabled}
      label="1/1"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
    <Plug
      id={1}
      {disabled}
      label="1/2"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 1 }}
    />
    <Plug
      id={2}
      {disabled}
      label="1/4"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 2 }}
    />
    <Plug
      id={3}
      {disabled}
      label="1/8"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 3 }}
    />
    <Plug
      id={4}
      {disabled}
      label="1/16"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 4 }}
    />
  </div>
</Panel>
