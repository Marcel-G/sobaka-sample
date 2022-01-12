<script lang="ts">
  import { SobakaContext, Sequencer, Sum } from 'sobaka-sample-web-audio'
  import { derived, writable } from 'svelte/store'
  import Panel from '../components/Panel.svelte'
  import Plug from '../components/Plug.svelte'
  import modules from '../state/modules'
  import SharedSequencer from './SharedSequencer.svelte'
  import { merge, omit, __ as _ } from 'lodash/fp'

  interface State {
    sequencers: Omit<Sequencer['state'], 'step'>[]
  }

  // @todo make context
  export let id: string
  export let position: { x: number; y: number }
  export let context: SobakaContext
  export let initial_state: State = {
    sequencers: [{ sequence: Array(8).fill(false) }]
  }

  const sum = new Sum(context)

  const sequencers = writable(
    initial_state.sequencers.map(state => writable({ step: 0, ...state }))
  )

  $: state = $sequencers.map(state => state)

  // Do not persist `step` as it updates automatically
  $: persistant_state = derived([...state], s => s.map(state => omit('step', state)))

  $: modules.update(id, {
    sequencers: $persistant_state
  })

  function add() {
    sequencers.update(state => [
      ...state,
      writable({
        step: 0,
        sequence: Array(8).fill(false)
      })
    ])
  }

  function sync() {
    state.forEach(sequencer => {
      sequencer.update(merge(_, { step: 0 }))
    })
  }

  // @todo this seems a little fragile
  let sequencer_modules: Sequencer[] = []
  function mount_sequencer(seq: Sequencer) {
    context.link(sum, seq, Sequencer.Input.Gate)
    sequencer_modules = [...sequencer_modules, seq]
  }
</script>

<Panel name="sequencer" {id} {position} height={2 + 1 * $sequencers.length} width={10}>
  {#each state as sub_state}
    <SharedSequencer {context} state={sub_state} on_mount={mount_sequencer} />
  {/each}
  <button on:click={sync}> sync </button>
  <button on:click={add}> add </button>

  <div slot="inputs">
    <Plug {id} name="gate" for_module={sum} for_input={Sum.Input.Signal} />
  </div>

  <div slot="outputs">
    {#each sequencer_modules as m, i}
      <Plug {id} for_module={m} name={`output_${i}`} />
    {/each}
  </div>
</Panel>
