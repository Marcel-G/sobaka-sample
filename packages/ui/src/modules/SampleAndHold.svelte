<script context="module" lang="ts">
  import { routing } from './routing'
  
  export const initialState: Record<string, never> = {}
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    inputs: [
      [0, 'Signal'],
      [1, 'Gate']
    ],
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
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.inputs} type="inputs" />
  </div>

  <div slot="outputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
</Panel>
