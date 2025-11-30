<script context="module" lang="ts">
  import { routing } from './routing'
  
  const NOTE_LABELS = [
    'C',
    'Cs',
    'D',
    'Ds',
    'E',
    'F',
    'Fs',
    'G',
    'Gs',
    'A',
    'As',
    'B'
  ] as const

  type State = {
    notes: { value: boolean }[]
  }
  export const initialState: State = {
    notes: Array(NOTE_LABELS.length).fill({ value: false })
  }
  
  // Routing definition - matches DSP layer's getRouting()
  export const moduleRouting = routing({
    inputs: [[0, 'Signal']],
    outputs: [[0, 'Out']]
  })
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import PlugList from './shared/PlugList.svelte'
  import { writable, type Readable } from 'svelte/store'

  export let state: State
  export let disabled = false
  
  // Workspace props (passed from ModuleWrapper)
  export let moduleId: string = 'storybook-module'
  export let position: Readable<{ x: number; y: number }> = writable({ x: 0, y: 0 })
  export let workspace: any = null

  let name = 'quantiser'

  function on_toggle(index: number) {
    state.notes[index].value = !state.notes[index].value
  }
</script>

<Panel
  {name}
  {moduleId}
  {position}
  {workspace}
  height={8}
  width={15}
  {disabled}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  <ul class="board">
    {#each NOTE_LABELS as label, i}
      <li>
        <button
          type="button"
          class="key {label}"
          class:pressed={state.notes[i].value}
          on:click={() => {
            if (!disabled) on_toggle(i)
          }}
          {disabled}
          aria-pressed={state.notes[i].value}
          aria-label="{label} note"
        ></button>
      </li>
    {/each}
  </ul>

  <div slot="inputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.inputs} type="inputs" />
  </div>

  <div slot="outputs">
    <PlugList {moduleId} {position} {workspace} {disabled} plugs={moduleRouting.outputs} type="outputs" />
  </div>
</Panel>

<!-- @todo fix minor key z-index -->
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
