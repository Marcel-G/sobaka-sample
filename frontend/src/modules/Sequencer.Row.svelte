<script lang="ts">
  import { SubStore } from '../utils/patches'

  import Knob from '../components/Knob.svelte'
  import Led from '../components/Led.svelte'

  export let range: number[]
  export let value: SubStore<number>
  export let index: number
  export let active: boolean

  /*
   * Binding stores in loops is not possible in Svelte currently
   * This Row component is to get around that limitation.
   * https://github.com/sveltejs/svelte/issues/2016
   */
</script>

<Knob bind:value={$value} {range} label={`step_${index + 1}`}>
  <div slot="inputs">
    <Led on={active} />
  </div>
</Knob>
