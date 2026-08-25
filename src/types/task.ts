export const TASK_STATUSES = ['not_started', 'in_progress', 'complete'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CATEGORY_KEYS = [
  'Work',
  'Business',
  'Home',
  'Personal',
  'Creative',
  'Writing',
  'Other',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const normalizeCategoryKey = (category: unknown): CategoryKey => {
  if (category === 'School' || category === 'X') {
    return 'Writing';
  }

  return CATEGORY_KEYS.includes(category as CategoryKey) ? (category as CategoryKey) : 'Other';
};

export const LAYOUT_MODES = ['board', 'tabbed'] as const;

export type LayoutMode = (typeof LAYOUT_MODES)[number];

export interface Task {
  id: string;
  title: string;
  category: CategoryKey;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
}

export interface BoredTask {
  id: string;
  title: string;
  createdAt: string;
}

export interface CompletionEvent {
  id: string;
  taskId: string;
  occurredAt: string;
  mode: 'archived_complete' | 'count_only';
}

export interface TaskDraft {
  title: string;
  category: CategoryKey;
  dueDate?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
}
