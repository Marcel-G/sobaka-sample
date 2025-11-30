<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import LevelIndicator from '../components/LevelIndicator.svelte'
  import { createVolumeRange } from '../range/rangeCreators'
  import { MixerDSP } from '@sobaka/dsp/module/mixer/node'
  import type { BaseModuleProps } from '../types/props'

  interface MixerProps extends BaseModuleProps {
    node: MixerDSP
  }

  let {
    node,
    disabled = false,
    position,
    onPlugClick,
    registerPlugElement,
    unregisterPlugElement,
    registerElement,
    unregisterElement
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
  {registerElement}
  {unregisterElement}
  height={8}
  width={6}
  --color-module-accent="var(--color-orange)"
  --color-module-background="var(--color-orange-dark)"
>
  {#snippet children()}
    <Layout type="center">
      <div class="flex flex-col items-center gap-2">
        <Knob {disabled} bind:value={state.volume} range={volume} label="vol">
          <div slot="knob-inputs">
            <Plug 
              ctx={routing.volume} 
              onClick={onPlugClick} 
              registerElement={registerPlugElement}
              unregisterElement={unregisterPlugElement}
            />
          </div>
        </Knob>
        
        <button
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
          class:text-red-400={state.muted}
          class:text-gray-400={!state.muted}
          class:hover:text-red-300={state.muted}
          class:hover:text-gray-300={!state.muted}
          on:click={() => (state.muted = !state.muted)}
        >
          {state.muted ? 'Muted' : 'Mute'}
        </button>
        
        <LevelIndicator module={node.getRoute('input_0').node as AudioNode} />
      </div>
    </Layout>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.input_0} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.input_1} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.input_2} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.input_3} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
  {/snippet}
</Panel>
