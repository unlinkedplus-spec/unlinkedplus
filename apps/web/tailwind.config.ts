import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:    '#F5C542',
        accent:     '#F57C00',
        navy:       '#172B4D',
        background: '#FAFAFA',
      },
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
