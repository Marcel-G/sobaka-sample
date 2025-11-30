<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import { create_bpm_range } from '../range/range_creators'
  import { ClockNode } from '@sobaka/dsp';
  import type { Readable } from 'svelte/store'

  export let node: ClockNode 
  export let disabled = false
  
  // Props forwarded from ModuleWrapper
  export let moduleId: string
  export let position: Readable<{ x: number; y: number }>
  export let onClose: ((id: string) => void) | null = null
  export let onClone: ((id: string) => void) | null = null
  export let onDrag: ((id: string, x: number, y: number) => void) | null = null
  export let registerElement: ((id: string, element: HTMLElement) => void) | null = null
  export let unregisterElement: ((id: string) => void) | null = null

  let name = node.name
  
  const routing = node.getRoutingDefinition()

  // @todo -- make this work with volt per octave
  const bpm = create_bpm_range()
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {registerElement}
  {unregisterElement}
  height={8}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <Layout type="center">
    <Knob {disabled} bind:value={node.state.bpm} range={bpm} label="bpm">
      <div slot="knob-inputs">
        <Plug ctx={routing.bpm} />
      </div>
    </Knob>
  </Layout>

  <div slot="outputs">
    <Plug ctx={routing.output_0} />
    <Plug ctx={routing.output_1} />
    <Plug ctx={routing.output_2} />
    <Plug ctx={routing.output_3} />
    <Plug ctx={routing.output_4} />
  </div>
</Panel>
