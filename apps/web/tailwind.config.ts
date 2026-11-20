import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core identity: navy as the calm base, sunshine for warmth,
        // lavender for the playful side, cream as the human canvas.
        navy:       '#172B4D',
        primary:    '#F5C542', // kept as alias for existing components
        sunshine:   '#F5C542',
        lavender:   '#B9A6FF',
        cream:      '#FFF7E6',
        accent:     '#F57C00',
        background: '#FFFBF2',
      },
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 40px -24px rgba(23, 43, 77, 0.45)',
        pop:  '0 10px 24px -12px rgba(23, 43, 77, 0.35)',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        popin: {
          '0%':   { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
        popin:  'popin 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
