<script context="module" lang="ts">
  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Layout from '../components/Layout.svelte'
  import { PlugType } from '../models/links'

  export let disabled = false
  const name = 'S & H'
</script>

<Panel
  {name}
  height={4}
  width={4}
  {disabled}
  --color-module-accent="var(--color-cyan)"
  --color-module-background="var(--color-cyan-dark)"
>
  <Layout type="center">🧿</Layout>

  <div slot="inputs">
    <Plug id={0} {disabled} label="Signal" ctx={{ type: PlugType.Input }} />
    <Plug id={1} {disabled} label="Gate" ctx={{ type: PlugType.Input }} />
  </div>

  <div slot="outputs">
    <Plug id={0} {disabled} label="Output" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
