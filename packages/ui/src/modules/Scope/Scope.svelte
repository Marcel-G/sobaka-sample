<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Display from './Display.svelte'
  import Input from '../../components/Input.svelte'
  import Tooltip from '../../components/Tooltip.svelte'
  import { createScaleRange } from '../../range/rangeCreators'
  import { ScopeNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface ScopeProps extends BaseModuleProps {
    node: ScopeNode
  }

  let {
    node,
    disabled = false,
    position,
    layer,
    onClose,
    onClone,
    onDrag,
    onPlugClick,
    bindPlugElement,
    bindElement
  }: ScopeProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const thresholdRange = createScaleRange(-1, 1)
  const zoomRange = createScaleRange(0.1, 30) // 0.1x (zoomed out) to 30x (zoomed in)

  const toggleMode = () => {
    $state.mode = $state.mode === 'waveform' ? 'spectrum' : 'waveform'
  }
</script>

<Panel
  {name}
  {position}
  {layer}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={15}
  width={13}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#snippet children()}
    <div class="flex flex-col h-full gap-2">
      <Display {node} mode={$state.mode} />
      <div class="flex flex-row gap-2 items-center">
        <button 
          class="bg-blue text-light py-2 px-4 rounded-lg cursor-pointer transition-colors duration-200 shadow-lg" 
          {disabled} 
          onclick={toggleMode}
        >
          {$state.mode === 'waveform' ? 'Wave' : 'Spec'}
        </button>
        {#if $state.mode === 'waveform'}
          <div class="flex-1">
            <Tooltip label="threshold" position="left">
              <Input {disabled} bind:value={$state.threshold} range={thresholdRange} />
            </Tooltip>
          </div>
          <div class="flex-1">
            <Tooltip label="zoom" position="left">
              <Input {disabled} bind:value={$state.zoom} range={zoomRange} />
            </Tooltip>
          </div>
        {/if}
      </div>
    </div>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.input_0} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.input_1} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.input_2} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.input_3} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>
