<style>
  .led {
    height: 0.5rem;
    width: 0.5rem;
    border-radius: 50%;

    background-color: brown;

    transition: background-color 0.125s;
  }

  .led.on {
    background-color: red;
  }
</style>

<script lang="ts">
  export let on: boolean = false
</script>

<div class="led" class:on />
