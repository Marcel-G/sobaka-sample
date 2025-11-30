<script lang="ts">
  import { getWorkspace } from '../context/workspace'
  import { readable } from 'svelte/store'
  import Mixer from '@sobaka/ui/modules/Mixer'
  import type { MixerDSP } from '@sobaka/dsp'

  interface Props {
    moduleId: string
    moduleType: 'Mixer'
  }

  let { moduleId, moduleType }: Props = $props()

  const { workspace, dsp, positions } = getWorkspace()
  
  const node = dsp.getStaticModule(moduleId) as MixerDSP
  
  // Static modules have a fixed position in the top-right
  const position = readable({ x: 0, y: 0 })
  
  // Plug callbacks - get plug type and pass to tryMakeLink
  const handlePlugClick = (routeName: string) => {
    const plugType = dsp.getPlugType(moduleId, routeName)
    if (plugType !== undefined) {
      workspace.tryMakeLink(moduleId, routeName, plugType)
    }
  }
  
  const handleBindPlugElement = (routeName: string, element: HTMLElement) => {
    const linkPoint = { moduleId, routeName }
    return positions.registerPlug(linkPoint, element)
  }
  
  const handleBindElement = (element: HTMLElement) => {
    return positions.registerModule(moduleId, element)
  }
</script>

{#if moduleType === 'Mixer'}
  <div class="fixed top-4 right-4 z-10">
    <Mixer
      {node}
      disabled={false}
      {position}
      onPlugClick={handlePlugClick}
      bindPlugElement={handleBindPlugElement}
      bindElement={handleBindElement}
    />
  </div>
{/if}
