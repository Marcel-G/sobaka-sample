<script lang="ts">
  export let type = 'center'
  // @todo more layouts to add here

  const isCenter = type === 'center'
</script>

<div class:center={isCenter}>
  <slot />
</div>

<style>
  .center {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
