<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import { createBipolarScaleRange } from '../range/rangeCreators'
  import { VcaNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface VcaProps extends BaseModuleProps {
    node: VcaNode
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
  }: VcaProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const attenuverter = createBipolarScaleRange()
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
  width={5}
  --color-module-accent="var(--color-purple)"
  --color-module-background="var(--color-purple-dark)"
>
  {#snippet children()}
    <Knob {disabled} bind:value={$state.value} range={attenuverter} label="gain">
      <div slot="knob-inputs">
        <Plug 
          ctx={routing.cv} 
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
      ctx={routing.output} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
  {/snippet}
</Panel>
