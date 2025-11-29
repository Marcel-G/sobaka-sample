<script context="module" lang="ts">
  type State = { bpm: number }

  export const initialState: State = { bpm: 120 }
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import { create_bpm_range } from '../range/range_creators'
  import { PlugType } from '@sobaka/state/models/links'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'clock'

  // @todo -- make this work with volt per octave
  const bpm = create_bpm_range()
</script>

<Panel
  {name}
  {disabled}
  {moduleId}
  {position}
  {workspace}
  height={8}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <Layout type="center">
    <Knob {disabled} bind:value={state.bpm} range={bpm} label="bpm">
      <div slot="knob-inputs">
        <Plug {moduleId} {position} {workspace} id={0} {disabled} label="bpm_cv" ctx={{ type: PlugType.Param }} />
      </div>
    </Knob>
  </Layout>

  <div slot="outputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="1/1" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={1} {disabled} label="1/2" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={2} {disabled} label="1/4" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={3} {disabled} label="1/8" ctx={{ type: PlugType.Output }} />
    <Plug {moduleId} {position} {workspace} id={4} {disabled} label="1/16" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
