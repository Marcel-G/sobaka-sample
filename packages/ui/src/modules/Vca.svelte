<script context="module" lang="ts">
  type State = { value: number }

  export const initialState: State = {
    value: 0.5
  }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { create_bipolar_scale_range } from '../range/range_creators'
  import { PlugType } from '@sobaka/state/models/links'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'vca'

  const attenuverter = create_bipolar_scale_range()
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {workspace}
  height={6}
  width={5}
  {disabled}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  <span>
    <Knob {disabled} bind:value={state.value} range={attenuverter} label="attenuverter" />
  </span>

  <div slot="inputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="Signal" ctx={{ type: PlugType.Input }} />
    <Plug {moduleId} {position} {workspace} id={1} {disabled} label="Cv" ctx={{ type: PlugType.Param }} />
  </div>

  <div slot="outputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="Output" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
