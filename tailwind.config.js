/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx}",
    "./*.html"
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0d1117',
          850: '#12171e',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
          400: '#6e7681',
          300: '#8b949e',
          200: '#c9d1d9',
          100: '#f0f6fc'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
