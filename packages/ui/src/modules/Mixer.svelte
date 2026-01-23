<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import LevelIndicator from '../components/LevelIndicator.svelte'
  import { createVolumeRange } from '../range/rangeCreators'
  import type { BaseModuleProps } from '../types/props'
  import type { MixerDSP } from '@sobaka/dsp';

  interface MixerProps extends BaseModuleProps {
    node: MixerDSP
  }

  let {
    node,
    disabled = false,
    position,
    onPlugClick,
    bindPlugElement,
    bindElement
  }: MixerProps = $props()

  const routing = node.getRoutingDefinition()
  const volume = createVolumeRange()
  
  // Bind directly to the node's state
  let state = $state(node.state)
  
  // Update the DSP when state changes
  $effect(() => {
    node.updateState(state)
  })
</script>

<Panel
  name="Output"
  {position}
  {disabled}
  {bindElement}
  height={10}
  width={0}
  --color-module-accent="var(--color-orange)"
  --color-module-background="var(--color-darker)"
>
  {#snippet children()}
    <Layout type="center">
      <div class="flex flex-row items-center gap-2">
        <Knob {disabled} bind:value={state.volume} range={volume} label="vol" />
        
        <button
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
          class:text-red-400={state.muted}
          class:text-gray-400={!state.muted}
          class:hover:text-red-300={state.muted}
          class:hover:text-gray-300={!state.muted}
          onclick={() => (state.muted = !state.muted)}
        >
          {state.muted ? 'Muted' : 'Mute'}
        </button>
        
        <LevelIndicator module={node.getRoute('input').node as AudioNode} />
      </div>
    </Layout>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.input} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>
