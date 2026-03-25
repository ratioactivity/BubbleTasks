export type TaskCategory =
  | 'Work'
  | 'School'
  | 'Business'
  | 'Home'
  | 'Personal'
  | 'Creative'
  | 'Other';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  dueDate?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
}
