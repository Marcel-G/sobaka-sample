<script lang="ts">
  import Panel from '../shared/Panel.svelte'
  import Plug from '../shared/Plug.svelte'
  import Graph from './Graph.svelte'
  import Input from '../../components/Input.svelte'
  import { createScaleRange, createTimeRange } from '../../range/rangeCreators'
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

  const duration = createTimeRange(0, 2)
  const level = createScaleRange(0, 1)
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
  width={15}
  --color-module-accent="var(--color-yellow)"
  --color-module-background="var(--color-yellow-dark)"
>
  {#snippet children()}
    <div class="flex flex-col gap-2 h-full w-full">
      <div class="flex-1 min-h-0 w-full">
        <Graph 
          {node}
          attack={$state.attack}
          decay={$state.decay}
          sustain={$state.sustain}
          release={$state.release}
        />
      </div>
      <div class="grid grid-cols-4 gap-2 w-full">
        <div class="pointer-events-auto flex flex-col">
          <Tooltip label="attack" position="left">
            <Input {disabled} bind:value={$state.attack} range={duration} />
          </Tooltip>
        </div>
        <div class="pointer-events-auto flex flex-col">
          <Tooltip label="decay" position="left">
            <Input {disabled} bind:value={$state.decay} range={duration} />
          </Tooltip>
        </div>
        <div class="pointer-events-auto flex flex-col">
          <Tooltip label="sustain" position="left">
            <Input {disabled} bind:value={$state.sustain} range={level} />
          </Tooltip>
        </div>
        <div class="pointer-events-auto flex flex-col">
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
