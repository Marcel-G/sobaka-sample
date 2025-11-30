<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { createTimeRange } from '../range/rangeCreators'
  import { DelayNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface DelayProps extends BaseModuleProps {
    node: DelayNode
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
  }: DelayProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const timeRange = createTimeRange()
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
    <Knob {disabled} bind:value={$state.delay} range={timeRange} label="time">
      <div slot="knob-inputs">
        <Plug 
          ctx={routing.delay} 
          onClick={onPlugClick} 
          bindElement={bindPlugElement}
        />
      </div>
    </Knob>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.input} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}

  {#snippet outputs()}
    <Plug 
      ctx={routing.tap_0} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.tap_1} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.tap_2} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.tap_3} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>
