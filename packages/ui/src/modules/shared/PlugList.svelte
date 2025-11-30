<script lang="ts">
  import { writable, type Readable } from 'svelte/store'
  import Plug from './Plug.svelte'
  import { PlugType, createPlugId } from '@sobaka/state/models/links'
  import type { PlugDefinition } from '../types'

  // Workspace props
  export let moduleId: string
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null
  export let disabled = false

  // Plug definitions
  export let plugs: PlugDefinition[] | undefined = undefined

  // Which type to render
  export let type: 'inputs' | 'outputs' | 'params'

  $: plugType = type === 'inputs'
    ? PlugType.Input
    : type === 'outputs'
    ? PlugType.Output
    : PlugType.Param
</script>

{#if plugs}
  {#each plugs as plug (plug.index)}
    <Plug 
      {position}
      {workspace}
      {disabled}
      plug_id={createPlugId(moduleId, plugType, plug.index)}
      label={plug.label}
    />
  {/each}
{/if}
