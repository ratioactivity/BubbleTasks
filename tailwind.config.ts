import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bubble: {
          base: '#ffeef6',
          sidebar: '#d8c8ff',
          surface: '#c7b1f4',
          text: '#ffffff',
          work: '#9bcfdd',
          school: '#8ec0e8',
          business: '#7fa7e1',
          home: '#e8a8cf',
          personal: '#f0b8d8',
          creative: '#b9b5f4',
          other: '#9d8ae0',
        },
      },
      fontFamily: {
        heading: ['Bigbesty', 'cursive'],
        body: ['Papernotes', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        bold: ['PapernotesBold', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(63, 52, 89, 0.15)',
      },
      backgroundImage: {
        stars: "url('/assets/stars.gif')",
      },
    },
  },
  plugins: [],
} satisfies Config;
