/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        surface2: '#1a1a1a',
        surface3: '#222222',
        border: '#262626',
        'border-light': '#333333',
        text: '#fafafa',
        muted: '#a3a3a3',
        dim: '#555555',
        accent: '#ffffff',
        sale: '#e11d48',
        'sale-light': '#fce7f0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Inter', 'sans-serif'],
      },
      transitionDuration: {
        250: '250ms',
        350: '350ms',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.4s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
        fadeIn: 'fadeUp 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
