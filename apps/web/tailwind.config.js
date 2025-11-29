/** @type {import('tailwindcss').Config} */

// TODO: Setup semantic colors: https://www.subframe.com/blog/how-to-setup-semantic-tailwind-colors
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    // Scan @sobaka/ui package for Tailwind classes
    '../../packages/ui/src/**/*.{html,js,svelte,ts}'
  ],
  plugins: []
}
