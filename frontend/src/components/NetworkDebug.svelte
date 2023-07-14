<script lang="ts">
  import { onMount } from 'svelte'
  import { get_repo } from '../worker/ipfs'

  let open_connections: string[] = []
  let self_addrs: string[] = []
  let self_id: string

  onMount(() => {
    const repo = get_repo()

    const { libp2p } = repo.helia

    self_id = libp2p.peerId.toString()

    libp2p.addEventListener('connection:open', event => {
      open_connections = libp2p.getConnections().map(conn => conn.remoteAddr.toString())
    })
    libp2p.addEventListener('connection:close', event => {
      open_connections = libp2p.getConnections().map(conn => conn.remoteAddr.toString())
    })

    libp2p.addEventListener('self:peer:update', event => {
      // Update multiaddrs list
      self_addrs = libp2p.getMultiaddrs().map(ma => ma.toString())
    })
  })
</script>

<div class="network-debug">
  <ul>
    <li>Self ID: {self_id}</li>
    <li>Self Addrs: 
      <ul>
        {#each self_addrs as addr}
          <li>{addr}</li>
        {/each}
      </ul>
    </li>
    <li>Open Connections: 
      <ul>
        {#each open_connections as addr}
          <li>{addr}</li>
        {/each}
      </ul>
    </li>
  </ul>
</div>

<style>
  .network-debug {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0;
    background: var(--module-background);
    color: var(--module-foreground);
    padding: 1rem;
    font-size: 0.8rem;
    font-family: monospace;
    z-index: 100;
  }
</style>