<script lang="ts">
  export let on: boolean = false
</script>

<div class="led" class:on />

<style>
  .led {
    height: 0.5rem;
    width: 0.5rem;
    margin: 0.25rem;
    border-radius: 50%;

    background-color: brown;

    transition: background-color 200ms ease-out;
  }

  .led.on {
    background-color: red;
    transition-duration: 0ms;
  }
</style>
