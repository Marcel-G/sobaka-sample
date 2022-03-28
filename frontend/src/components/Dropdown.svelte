<style>
  select {
    color: var(--module-foreground);
    font-family: monospace;
    width: 100%;
    margin-bottom: 0.5rem;

    cursor: pointer;

    border-bottom: 2px solid var(--module-highlight);

    transition: border-color 0.25s;
  }

  select:hover {
    border-color: var(--foreground);
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
