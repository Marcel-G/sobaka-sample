<script context="module" lang="ts">
  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Layout from '../components/Layout.svelte'
  import { PlugType } from '@sobaka/state/models/links'
  import { writable, type Readable } from 'svelte/store'

  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  const name = 'S & H'
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {workspace}
  height={4}
  width={4}
  {disabled}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  <Layout type="center">🧿</Layout>

  <div slot="inputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="Signal" ctx={{ type: PlugType.Input }} />
    <Plug {moduleId} {position} {workspace} id={1} {disabled} label="Gate" ctx={{ type: PlugType.Input }} />
  </div>

  <div slot="outputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="Output" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
