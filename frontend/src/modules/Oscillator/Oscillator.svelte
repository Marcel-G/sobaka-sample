<script context="module" lang="ts">
  import { ModuleTheme } from '../../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--pink)',
    background: 'var(--pink-dark)'
  }

  type State = {
    pitch: number
    shape: number
  }

  export const initialState: State = {
    pitch: 0,
    shape: 0
  }
</script>

<script lang="ts">
  import type { Oscillator, OscillatorShape } from 'sobaka-dsp'
  import { onDestroy, onMount } from 'svelte'
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import { into_style } from '../../components/Theme.svelte'
  import { PlugType } from '../../workspace/plugs'
  import Knob from '../../components/Knob/Knob.svelte'
  import { get_context as get_audio_context } from '../../audio'
  import Layout from '../../components/Layout.svelte'
  import RingSpinner from '../../components/RingSpinner.svelte'
  import { create_volt_per_octave_range } from '../../range/range_creators'
  import { ChoiceRange, RangeType } from '../../range/range'
  import Switch from '../../components/Switch.svelte'
  import Sine from './Sine.svelte'
  import Saw from './Saw.svelte'
  import Square from './Square.svelte'
  import Triangle from './Triangle.svelte'

  export let state: State
  let name = 'oscillator'
  let oscillator: Oscillator
  let node: AudioNode
  let pitch_param: AudioParam
  let loading = true

  const context = get_audio_context()

  const shapes: OscillatorShape[] = ['Sine', 'Square', 'Triangle', 'Saw']

  onMount(async () => {
    const { Oscillator } = await import('sobaka-dsp')
    oscillator = await Oscillator.create($context)
    node = oscillator.node()
    pitch_param = oscillator.get_param('Pitch')
    loading = false
  })

  // Update the sobaka node when the state changes
  $: pitch = state.pitch
  $: pitch_param?.setValueAtTime(pitch, 0)

  $: oscillator?.command({ SetShape: shapes[state.shape] })

  const freq_range = create_volt_per_octave_range()

  const shape_range: ChoiceRange = {
    type: RangeType.Choice,
    choices: shapes.map((shape, i) => ({ label: shape, value: i }))
  }

  onDestroy(() => {
    oscillator?.destroy()
    oscillator?.free()
  })
</script>

<Panel {name} height={8} width={8} custom_style={into_style(theme)}>
  {#if loading}
    <Layout type="center">
      <RingSpinner />
    </Layout>
  {:else}
    <div class="controls">
      <Switch bind:value={state.shape} range={shape_range} label="shape">
        <div class="wave" slot="value">
          {#if shapes[state.shape] === 'Square'}
            <Square />
          {:else if shapes[state.shape] === 'Sine'}
            <Sine />
          {:else if shapes[state.shape] === 'Saw'}
            <Saw />
          {:else if shapes[state.shape] === 'Triangle'}
            <Triangle />
          {/if}
        </div>
      </Switch>
      <Knob bind:value={state.pitch} range={freq_range} label="pitch" orientation="ns">
        <div slot="knob-inputs">
          <Plug
            id={0}
            label="pitch cv"
            ctx={{ type: PlugType.Param, param: pitch_param }}
          />
        </div>
      </Knob>
    </div>
  {/if}
  <div slot="inputs">
    <Plug
      id={1}
      label="reset"
      ctx={{ type: PlugType.Input, module: node, connectIndex: 0 }}
    />
  </div>
  <div slot="outputs">
    <Plug
      id={0}
      label="output"
      ctx={{ type: PlugType.Output, module: node, connectIndex: 0 }}
    />
  </div>
</Panel>

<style>
  .controls {
    display: grid;
    grid-template-columns: auto auto;
  }

  .wave {
    height: 0.75rem;
    display: flex;
    justify-content: center;
    fill: var(--module-foreground);
    stroke: var(--module-foreground);
    margin-bottom: 0.25rem;
  }
</style>
