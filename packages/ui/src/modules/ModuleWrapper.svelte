<script lang="ts">
  import { get_component } from '.'
  import { type Module } from '@sobaka/state/models/workspace'
  import { init_module_context } from './context'
  import { hasContext, getContext } from 'svelte'
  import { writable } from 'svelte/store'

  export let module: Module
  export let disabled = false

  // Get workspace context if available (for app usage)
  // If not available (e.g., in Storybook), components will use their defaults
  const workspaceContext: any = hasContext('workspace') 
    ? getContext('workspace') 
    : null
  
  const workspace = workspaceContext?.workspace ?? null
  const position = workspace?.module_position?.(module.id) ?? writable({ x: 0, y: 0 })

  // Still initialize module context for backwards compatibility
  init_module_context(module.id)

  const component = get_component(module)
</script>

<svelte:component 
  this={component} 
  state={module.state as any} 
  {disabled}
  moduleId={module.id}
  {position}
  {workspace}
/>
