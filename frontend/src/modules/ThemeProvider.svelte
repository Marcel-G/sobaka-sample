<script context="module" lang="ts">
  export interface ModuleTheme {
    primary: 'pink' | 'cyan' | 'purple' | 'yellow'
  }

  export const default_theme: ModuleTheme = {
    primary: 'pink'
  }

  export const getThemeContext = () => getContext<ModuleTheme>('theme')
</script>

<script lang="ts">
  import { getContext, setContext } from 'svelte'

  export let theme: Partial<ModuleTheme> = {}
  const mergedTheme = { ...default_theme, ...theme }

  setContext('theme', mergedTheme)
</script>

<slot />
