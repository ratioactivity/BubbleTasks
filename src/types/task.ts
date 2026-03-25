export const TASK_STATUSES = ['Not Started', 'In Progress', 'Complete'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CATEGORY_KEYS = [
  'Work',
  'School',
  'Business',
  'Home',
  'Personal',
  'Creative',
  'Other',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

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
  notes?: string;
}

export interface BoredTask {
  id: string;
  title: string;
  createdAt: string;
  completedForInsightCount: boolean;
}
