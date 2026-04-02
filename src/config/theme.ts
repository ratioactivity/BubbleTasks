import { CATEGORY_CONFIG } from './categories';

export const BUBBLE_THEME = {
  app: {
    background: '#fff8ff',
    sidebar: '#f6f3ff',
    surface: '#ffffff',
    text: '#3f3459',
  },
  fontFamilies: {
    heading: 'Bigbesty',
    body: 'Papernotes',
    bold: 'PapernotesBold',
  },
  accents: {
    singleStars: ['/assets/singlestar1.gif', '/assets/singlestar2.gif', '/assets/singlestar3.gif'],
    starsConstellation: '/assets/stars.gif',
  },
  categories: CATEGORY_CONFIG,
} as const;
