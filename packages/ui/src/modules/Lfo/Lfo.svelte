<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Knob from '../../components/Knob/Knob.svelte'
  import { createLfoRateRange } from '../../range/rangeCreators'
  import { LfoNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface LfoProps extends BaseModuleProps {
    node: LfoNode
  }

  let {
    node,
    disabled = false,
    position,
    onClose,
    onClone,
    onDrag,
    onPlugClick,
    bindPlugElement,
    bindElement
  }: LfoProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const rateRange = createLfoRateRange()
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={8}
  width={6}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Knob {disabled} bind:value={$state.rate} range={rateRange} label="rate">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.rate} 
            onClick={onPlugClick} 
            bindElement={bindPlugElement}
          />
        </div>
      </Knob>
    </div>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.reset} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}

  {#snippet outputs()}
    <Plug 
      ctx={routing.output} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>

<style>
  .controls {
    display: flex;
    justify-content: center;
  }
</style>
