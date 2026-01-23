<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import { QuantiserNode } from '@sobaka/dsp'
  import type { BaseModuleProps } from '../types/props'
  import { intoReadable } from '@sobaka/state/util/store'

  interface QuantiserProps extends BaseModuleProps {
    node: QuantiserNode
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
  }: QuantiserProps = $props()

  const NOTE_LABELS = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'] as const

  let name = node.name
  const state = intoReadable(node.state)
  const routing = node.getRoutingDefinition()

  function onToggle(index: number) {
    const newNotes = [...$state.notes]
    newNotes[index] = !newNotes[index]
    $state.notes = newNotes
  }
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
  width={15}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  {#snippet children()}
    <ul class="board">
      {#each NOTE_LABELS as label, i}
        <li>
          <button
            type="button"
            class="key {label}"
            class:pressed={$state.notes[i]}
            onclick={() => {
              if (!disabled) onToggle(i)
            }}
            {disabled}
            aria-pressed={$state.notes[i]}
            aria-label="{label} note"
          ></button>
        </li>
      {/each}
    </ul>
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
  .board {
    display: flex;
    flex-direction: row;
    height: 100%;
  }

  .key {
    cursor: pointer;
    background-color: white;
    border: 1px solid black;
    flex-grow: 1;
    border-radius: 0px 0px 2px 2px;
  }
  
  .key:not(:last-child) {
    border-width: 1px 0 1px 1px;
  }

  .key.Cs,
  .key.Ds,
  .key.Fs,
  .key.Gs,
  .key.As {
    background-color: black;
    height: 55%;
    flex: 0 0 0.75rem;
    margin: 0 calc(-0.75rem / 2);
    z-index: 1;
    border-width: 1px;
  }

  .key:hover {
    background-color: #f0f0f0;
  }

  .key.pressed {
    background-color: var(--color-module-accent);
  }

  li {
    display: contents;
  }
</style>
