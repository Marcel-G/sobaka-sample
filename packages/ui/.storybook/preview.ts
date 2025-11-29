import type { Preview } from '@storybook/svelte'
import '../src/app.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#1a1a1a'
        },
        {
          name: 'light',
          value: '#ffffff'
        }
      ]
    }
  }
}

export default preview
