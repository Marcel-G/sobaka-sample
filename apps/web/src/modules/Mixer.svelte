<script context="module" lang="ts">
  type State = {
    volume: number
    muted: boolean
  }

  export const initialState: State = {
    volume: 0.7,
    muted: false
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import Knob from '@sobaka/ui/components/Knob/Knob.svelte'
  import { getGlobalCtx } from '../context/global'
  import Layout from '@sobaka/ui/components/Layout.svelte'
  import RingSpinner from '@sobaka/ui/components/RingSpinner.svelte'
  import { create_volume_range } from '@sobaka/ui/range/range_creators'
  import LevelIndicator from '@sobaka/ui/components/LevelIndicator.svelte'
  import { get_workspace } from '../context/workspace'

  export let state: State = initialState
  export let disabled = false

  let gain: GainNode
  let loading = true

  const { workspace } = get_workspace()
  const context = getGlobalCtx()
  const volume = create_volume_range()

  onMount(async () => {
    gain = context.audio.createGain()

    gain.gain.setValueAtTime(0, context.audio.currentTime)
    gain.connect(context.audio.destination)

    loading = false
  })

  $: if (gain && !loading) {
    const targetVolume = state.muted ? 0 : state.volume
    gain.gain.setTargetAtTime(targetVolume, context.audio.currentTime, 0.01)
  }
</script>

<div
  class="fixed top-0 right-0 m-4 z-100"
  style="--color-module-accent: var(--color-light); --color-module-background: var(--color-darker);"
>
  {#if loading}
    <Layout type="center">
      <RingSpinner color="blue" size="sm" />
    </Layout>
  {:else}
    <div
      class="flex items-center justify-between shadow-lg rounded-lg p-2 cursor-move border-box select-none relative z-5 border-2 bg-module-background border-module-accent"
    >
      <button
        on:click={() => {
          workspace.try_make_link_to_mixer()
        }}
      >
        Link
      </button>
      <button
        class="px-2 py-1 rounded text-sm font-medium transition-colors"
        class:text-red-400={state.muted}
        class:text-gray-400={!state.muted}
        class:hover:text-red-300={state.muted}
        class:hover:text-gray-300={!state.muted}
        on:click={() => (state.muted = !state.muted)}
      >
        {state.muted ? 'Muted' : 'Mute'}
      </button>

      <div>
        <Knob {disabled} bind:value={state.volume} range={volume} label="vol"></Knob>
      </div>
      <LevelIndicator module={gain} />
    </div>
  {/if}
</div>
