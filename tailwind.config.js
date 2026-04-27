/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F5A623',
          dark: '#D88E12',
          soft: '#FCE3B5',
        },
        ink: '#1A1A1A',
        muted: '#6B6B6B',
        cream: '#FFFBF4',
        line: '#EDE4D3',
        success: '#2E8B57',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -8px rgba(26, 26, 26, 0.12)',
        cardHover: '0 12px 32px -12px rgba(245, 166, 35, 0.35)',
      },
      borderRadius: {
        xl2: '1rem',
      },
      keyframes: {
        pulseHighlight: {
          '0%, 100%': { boxShadow: '0 4px 20px -8px rgba(26, 26, 26, 0.12)' },
          '50%': { boxShadow: '0 0 0 4px rgba(245, 166, 35, 0.35)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        pulseHighlight: 'pulseHighlight 1.2s ease-in-out 2',
        fadeIn: 'fadeIn 200ms ease-out',
        scaleIn: 'scaleIn 200ms ease-out',
      },
    },
  },
  plugins: [],
}
