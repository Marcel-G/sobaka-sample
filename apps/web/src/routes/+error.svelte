<script>
  import { page } from '$app/stores'
</script>

<div class="full-page">
  <h1>Sorry! {$page.status}</h1>
  <h2>{$page.error.message}</h2>
</div>

<style>
  .full-page {
    font-family: monospace;
    margin: 1rem;
    height: 100%;
    display: flex;
    text-align: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>
