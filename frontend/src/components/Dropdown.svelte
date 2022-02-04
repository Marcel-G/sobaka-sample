<style>
  select {
    width: 100%;
    margin-bottom: 0.5rem;
  }
</style>

<script lang="ts">
  export let options: string[]
  export let selected: string
</script>

<select bind:value={selected}>
  {#each options as option}
    <option value={option}>
      {option}
    </option>
  {/each}
</select>
