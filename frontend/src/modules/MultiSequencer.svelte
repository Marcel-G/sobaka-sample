<script context="module" lang="ts">
  import { ModuleTheme } from '../components/Theme.svelte'
  export const theme: Partial<ModuleTheme> = {
    highlight: 'var(--cyan)',
    background: 'var(--cyan-dark)'
  }
</script>

<script lang="ts">
  import { Sequencer, Sum } from 'sobaka-sample-audio-worklet'
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import SharedSequencer from './SharedSequencer.svelte'
  import { get_module_context } from './ModuleWrapper.svelte'
  import { into_style } from '../components/Theme.svelte'

  const { context, get_sub_state, update_sub_state } = get_module_context()

  let count = get_sub_state<number>('count') || 1

  const sum = new Sum(context)

  function add() {
    count += 1
  }

  // Update the global state when state changes
  $: update_sub_state('count', count)

  // @todo this seems a little fragile
  let sequencer_modules: Sequencer[] = []
  function mount_sequencer(i: number) {
    return (seq: Sequencer) => {
      context.link(sum, seq, 'Gate')
      sequencer_modules[i] = seq
    }
  }

  function sync() {
    sequencer_modules.forEach(module => {
      module.update({ step: 0, sequence: module.state.sequence })
    })
  }
</script>

<Panel
  name="multi-sequencer"
  height={4 + 2 * count}
  width={24}
  custom_style={into_style(theme)}
>
  {#each { length: count } as _, i}
    <SharedSequencer name={`Sequencer_${i}`} on_mount={mount_sequencer(i)} />
  {/each}
  <button on:click={sync}> sync </button>
  <button on:click={add}> add </button>

  <div slot="inputs">
    <Plug for_node={sum} for_input={'Signal'} />
  </div>

  <div slot="outputs">
    {#each { length: count } as _, i}
      <Plug for_node={sequencer_modules[i]} name={`output_${i}`} />
    {/each}
  </div>
</Panel>
