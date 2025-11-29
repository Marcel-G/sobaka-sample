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
</script>

<Panel
  name="noise"
  {disabled}
  {moduleId}
  {position}
  {workspace}
  height={5}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <Layout type="center">💥</Layout>

  <div slot="outputs">
    <Plug {moduleId} {position} {workspace} id={0} {disabled} label="Noise" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
