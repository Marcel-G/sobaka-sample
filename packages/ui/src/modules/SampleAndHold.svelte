<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Layout from '../components/Layout.svelte'
  import { SampleAndHoldNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface SampleAndHoldProps extends BaseModuleProps {
    node: SampleAndHoldNode
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
  }: SampleAndHoldProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={4}
  width={4}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#snippet children()}
    <Layout type="center">🧿</Layout>
  {/snippet}

  {#snippet inputs()}
    <Plug 
      ctx={routing.gate} 
      onClick={onPlugClick} 
      bindElement={bindPlugElement}
    />
    <Plug 
      ctx={routing.signal} 
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
