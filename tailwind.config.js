/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#122350',
          deep:    '#0C1A3D',
          soft:    '#1B3268',
        },
        fleet: {
          blue:      '#0F6FEE',
          'blue-dk': '#0A57C2',
          'blue-tint':'#EAF2FE',
          gold:      '#F5B301',
          ink:       '#101828',
          'ink-2':   '#475467',
          'ink-3':   '#8A94A6',
          line:      '#E4E9F2',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
