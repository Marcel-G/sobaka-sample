<script lang="ts">
  export let pressed = false
  export let onClick = () => {}
</script>

<button class:pressed on:click={onClick} />

<style>
  button {
    position: relative;
    margin: 0.125rem;
    flex: 1 1 auto;

    min-height: 1.5rem;

    /* position: relative; */
    display: block;

    cursor: pointer;
    pointer-events: all;

    aspect-ratio: 1;

    padding: 0;
    border-radius: 0.5rem;
    border: 2px solid var(--module-highlight);
    background-color: var(--module-knob-background);

    box-shadow: inset 0 0 10px var(--background);

    transition: border-color 0.25s, box-shadow 0.25s;
  }

  button:hover {
    border-color: var(--foreground);
  }

  button.pressed {
    background-color: var(--comment);
    box-shadow: inset 0 0 5px var(--background);
  }
</style>
