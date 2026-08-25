import type { CategoryKey } from '../types/task';

export interface CategoryMeta {
  name: CategoryKey;
  colorClass: string;
  icon: string;
}

export const categoryMeta: CategoryMeta[] = [
  { name: 'Home', colorClass: 'bg-bubble-home', icon: '/assets/pink.gif' },
  { name: 'Personal', colorClass: 'bg-bubble-personal', icon: '/assets/orange.gif' },
  { name: 'Creative', colorClass: 'bg-bubble-creative', icon: '/assets/yellow.gif' },
  { name: 'Work', colorClass: 'bg-bubble-work', icon: '/assets/green.gif' },
  { name: 'X', colorClass: 'bg-bubble-school', icon: '/assets/teal.gif' },
  { name: 'Business', colorClass: 'bg-bubble-business', icon: '/assets/blue.gif' },
  { name: 'Other', colorClass: 'bg-bubble-other', icon: '/assets/purple.gif' },
];
