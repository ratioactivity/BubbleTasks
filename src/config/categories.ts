import type { CategoryKey } from '../types/task';

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  pastelColor: string;
  textColor: string;
  gifAssetPath: string;
}

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  Home: {
    key: 'Home',
    label: 'Home',
    pastelColor: '#ffd8ee',
    textColor: '#6b2c55',
    gifAssetPath: '/assets/pink.gif',
  },
  Personal: {
    key: 'Personal',
    label: 'Personal',
    pastelColor: '#ffe6c8',
    textColor: '#7a4a21',
    gifAssetPath: '/assets/orange.gif',
  },
  Creative: {
    key: 'Creative',
    label: 'Creative',
    pastelColor: '#fff6c8',
    textColor: '#7d6613',
    gifAssetPath: '/assets/yellow.gif',
  },
  Work: {
    key: 'Work',
    label: 'Work',
    pastelColor: '#d9f7d8',
    textColor: '#255f2f',
    gifAssetPath: '/assets/green.gif',
  },
  School: {
    key: 'School',
    label: 'School',
    pastelColor: '#cff6f4',
    textColor: '#195957',
    gifAssetPath: '/assets/teal.gif',
  },
  Business: {
    key: 'Business',
    label: 'Business',
    pastelColor: '#d4e8ff',
    textColor: '#20486e',
    gifAssetPath: '/assets/blue.gif',
  },
  Other: {
    key: 'Other',
    label: 'Other',
    pastelColor: '#e6dbff',
    textColor: '#4f367d',
    gifAssetPath: '/assets/purple.gif',
  },
};

export const CATEGORY_ORDER: CategoryKey[] = [
  'Work',
  'School',
  'Business',
  'Home',
  'Personal',
  'Creative',
  'Other',
];
