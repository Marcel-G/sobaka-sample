<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Knob from '../components/Knob/Knob.svelte'
  import Layout from '../components/Layout.svelte'
  import { createBpmRange } from '../range/range_creators'
  import { ClockNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
    import { intoReadable } from '@sobaka/state/util/store';

  interface ClockProps extends BaseModuleProps {
    node: ClockNode
  }

  let {
    node,
    disabled = false,
    position,
    onClose,
    onClone,
    onDrag,
    onPlugClick,
    registerPlugElement,
    unregisterPlugElement,
    registerElement,
    unregisterElement
  }: ClockProps = $props()

  let name = node.name
  const state = intoReadable(node.state);
  
  const routing = node.getRoutingDefinition()

  const bpm = createBpmRange()
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {registerElement}
  {unregisterElement}
  height={8}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  {#snippet children()}
    <Layout type="center">
      <Knob {disabled} bind:value={$state.bpm} range={bpm} label="bpm">
        <div slot="knob-inputs">
          <Plug 
            ctx={routing.bpm} 
            onClick={onPlugClick} 
            registerElement={registerPlugElement}
            unregisterElement={unregisterPlugElement}
          />
        </div>
      </Knob>
    </Layout>
  {/snippet}

  {#snippet outputs()}
    <Plug 
      ctx={routing.output_0} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.output_1} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.output_2} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.output_3} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
    <Plug 
      ctx={routing.output_4} 
      onClick={onPlugClick} 
      registerElement={registerPlugElement}
      unregisterElement={unregisterPlugElement}
    />
  {/snippet}
</Panel>
