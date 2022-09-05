<script context="module" lang="ts">
  export interface ModuleTheme {
    highlight: string
    background: string
    foreground: string
    knob_background: string
  }

  export const default_theme: ModuleTheme = {
    highlight: 'var(--pink)',
    background: 'var(--comment)',
    foreground: 'var(--foreground)',
    knob_background: 'var(--current-line)'
  }

  export const into_style = (theme: Partial<ModuleTheme> = {}): string => {
    const final_theme = { ...default_theme, ...theme }

    return Object.entries(final_theme)
      .map(([key, value]) => {
        return `--module-${key.replaceAll('_', '-')}: ${value}`
      })
      .join(';')
  }
</script>

<style lang="postcss">
  :root {
    --background: #282a36;
    --current-line: #44475a;
    --foreground: #f8f8f2;
    --comment: #6272a4;
    --cyan: #8be9fd;
    --cyan-dark: color(#8be9fd blend(#6272a4 85%));
    --green: #50fa7b;
    --orange: #ffb86c;
    --pink: #ff79c6;
    --pink-dark: color(#ff79c6 blend(#6272a4 85%));
    --purple: #bd93f9;
    --purple-dark: color(#bd93f9 blend(#6272a4 85%));
    --red: #ff5555;
    --yellow: #f1fa8c;
    --yellow-dark: color(#f1fa8c blend(#6272a4 85%));
  }
</style>
