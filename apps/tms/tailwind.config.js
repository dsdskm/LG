/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(from var(--color-primary) r g b / <alpha-value>)',
        'primary-hover': 'rgb(from var(--color-primary-hover) r g b / <alpha-value>)',
        'primary-foreground': 'rgb(from var(--color-primary-foreground) r g b / <alpha-value>)'
      }
    }
  },
  plugins: []
}
