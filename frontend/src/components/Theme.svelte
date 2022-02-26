<style>
  :root {
    --background: #282a36;
    --current-line: #44475a;
    --foreground: #f8f8f2;
    --comment: #6272a4;
    --cyan: #8be9fd;
    --green: #50fa7b;
    --orange: #ffb86c;
    --pink: #ff79c6;
    --purple: #bd93f9;
    --red: #ff5555;
    --yellow: #f1fa8c;
  }
</style>

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
