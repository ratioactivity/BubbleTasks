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
    pastelColor: '#e8a8cf',
    textColor: '#ffffff',
    gifAssetPath: '/assets/pink.gif',
  },
  Personal: {
    key: 'Personal',
    label: 'Personal',
    pastelColor: '#f0b8d8',
    textColor: '#ffffff',
    gifAssetPath: '/assets/orange.gif',
  },
  Creative: {
    key: 'Creative',
    label: 'Creative',
    pastelColor: '#b9b5f4',
    textColor: '#ffffff',
    gifAssetPath: '/assets/yellow.gif',
  },
  Work: {
    key: 'Work',
    label: 'Work',
    pastelColor: '#9bcfdd',
    textColor: '#ffffff',
    gifAssetPath: '/assets/green.gif',
  },
  Writing: {
    key: 'Writing',
    label: 'Writing',
    pastelColor: '#8ec0e8',
    textColor: '#ffffff',
    gifAssetPath: '/assets/teal.gif',
  },
  Business: {
    key: 'Business',
    label: 'Business',
    pastelColor: '#7fa7e1',
    textColor: '#ffffff',
    gifAssetPath: '/assets/blue.gif',
  },
  Other: {
    key: 'Other',
    label: 'Other',
    pastelColor: '#9d8ae0',
    textColor: '#ffffff',
    gifAssetPath: '/assets/purple.gif',
  },
};

export const CATEGORY_ORDER: CategoryKey[] = [
  'Work',
  'Business',
  'Home',
  'Personal',
  'Creative',
  'Writing',
  'Other',
];
