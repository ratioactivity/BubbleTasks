import type { TaskStatus } from '../types/task';

export const formatDisplayDate = (isoDate?: string): string => {
  if (!isoDate) {
    return '';
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatPriorityStars = (priority?: 1 | 2 | 3 | 4 | 5): string => {
  if (!priority) {
    return '';
  }

  return '★'.repeat(priority);
};

export const formatStatusLabel = (status: TaskStatus): string => {
  if (status === 'not_started') {
    return 'Not Started';
  }

  if (status === 'in_progress') {
    return 'In Progress';
  }

  return 'Complete';
};
