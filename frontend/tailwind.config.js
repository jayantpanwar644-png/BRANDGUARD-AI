/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0F1318',
          subtle: '#14181F',
        },
        sidebar: '#191D23',
        card: {
          DEFAULT: '#2B3038',
          elevated: '#323842',
          muted: '#22272E',
        },
        brand: {
          primary: '#3B82F6',
          hover: '#2563EB',
          accent: '#6366F1',
        },
        text: {
          primary: '#F5F5F3',
          secondary: '#AEB4BE',
          muted: '#717885',
        },
        status: {
          positive: '#55B889',
          warning: '#E5AE55',
          negative: '#E27676',
          info: '#60A5FA',
        }
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
