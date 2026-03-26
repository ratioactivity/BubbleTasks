import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bubble: {
          base: '#fff8ff',
          sidebar: '#f6f3ff',
          surface: '#ffffff',
          text: '#3f3459',
          work: '#d9f7d8',
          school: '#cff6f4',
          business: '#d4e8ff',
          home: '#ffd8ee',
          personal: '#ffe6c8',
          creative: '#fff6c8',
          other: '#e6dbff',
        },
      },
      fontFamily: {
        heading: ['Bigbesty', 'cursive'],
        body: ['Papernotes', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        bold: ['PapernotesBold', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(63, 52, 89, 0.08)',
      },
      backgroundImage: {
        stars: "url('/assets/stars.gif')",
      },
    },
  },
  plugins: [],
} satisfies Config;
