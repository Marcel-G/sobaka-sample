<script context="module" lang="ts">
  import { routing } from './routing'
  
  export const initialState: Record<string, never> = {}
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    outputs: [[0, 'Out']]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import Layout from '../components/Layout.svelte'
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
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
</Panel>
