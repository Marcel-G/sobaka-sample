<script lang="ts">
  import Mixer from '@sobaka/ui/modules/Mixer.svelte'
  import { getWorkspace } from '../context/workspace'
  import { readable } from 'svelte/store'
  import type { MixerDSP } from '@sobaka/dsp/module/mixer/node'

  interface Props {
    moduleId: string
    moduleType: 'Mixer'
  }

  let { moduleId, moduleType }: Props = $props()

  const { workspace, dsp, positions } = getWorkspace()
  
  const node = dsp.getStaticModule(moduleId) as MixerDSP
  
  // Static modules have a fixed position in the top-right
  const position = readable({ x: 0, y: 0 })
  
  // Plug callbacks - map routeName to full linkPoint
  const handlePlugClick = (routeName: string) => {
    workspace.tryMakeLink(moduleId, routeName)
  }
  
  const handleRegisterPlugElement = (routeName: string, element: HTMLElement) => {
    const linkPoint = { moduleId, routeName }
    positions.registerPlug(linkPoint, element)
  }
  
  const handleUnregisterPlugElement = (routeName: string) => {
    const linkPoint = { moduleId, routeName }
    positions.removePlug(linkPoint)
  }
  
  const handleRegisterElement = (element: HTMLElement) => {
    positions.registerModule(moduleId, element)
  }
  
  const handleUnregisterElement = () => {
    positions.removeModule(moduleId)
  }
</script>

{#if moduleType === 'Mixer'}
  <div class="fixed top-4 right-4 z-100">
    <Mixer
      {node}
      disabled={false}
      {position}
      onPlugClick={handlePlugClick}
      registerPlugElement={handleRegisterPlugElement}
      unregisterPlugElement={handleUnregisterPlugElement}
      registerElement={handleRegisterElement}
      unregisterElement={handleUnregisterElement}
    />
  </div>
{/if}
