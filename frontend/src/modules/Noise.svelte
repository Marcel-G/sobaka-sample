<script context="module" lang="ts">
  export const initialState: Record<string, never> = {}
</script>

<script lang="ts">
  import Panel from './shared/Panel.svelte'
  import Plug from './shared/Plug.svelte'
  import Layout from '../components/Layout.svelte'
  import { PlugType } from '../models/links'

  export let disabled = false
</script>

<Panel
  name="noise"
  {disabled}
  height={5}
  width={5}
  --color-module-accent="var(--color-pink)"
  --color-module-background="var(--color-pink-dark)"
>
  <Layout type="center">💥</Layout>

  <div slot="outputs">
    <Plug id={0} {disabled} label="Noise" ctx={{ type: PlugType.Output }} />
  </div>
</Panel>
