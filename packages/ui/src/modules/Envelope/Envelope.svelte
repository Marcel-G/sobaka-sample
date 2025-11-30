<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Graph from './Graph.svelte'
  import Input from '../../components/Input.svelte'
  import { createTimeRange } from '../../range/rangeCreators'
  import Tooltip from '../../components/Tooltip.svelte'
  import { EnvelopeNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface EnvelopeProps extends BaseModuleProps {
    node: EnvelopeNode
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
  }: EnvelopeProps = $props()

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  const duration = createTimeRange()
</script>

<Panel
  {name}
  {position}
  {disabled}
  {onClose}
  {onClone}
  {onDrag}
  {bindElement}
  height={10}
  width={12}
  --color-module-accent="var(--color-yellow)"
  --color-module-background="var(--color-yellow-dark)"
>
  {#snippet children()}
    <div class="controls">
      <Graph attack={$state.attack} release={$state.release} />
      <div class="values">
        <div class="input">
          <Tooltip label="attack" position="left">
            <Input {disabled} bind:value={$state.attack} range={duration} />
          </Tooltip>
        </div>
        <div class="input">
          <Tooltip label="release" position="left">
            <Input {disabled} bind:value={$state.release} range={duration} />
          </Tooltip>
        </div>
      </div>
    </div>
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

<style>
  .controls {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    height: 100%;
  }

  .values {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    justify-content: center;
  }

  .input {
    pointer-events: auto;
  }
</style>
