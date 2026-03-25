import type { BoredTask, Task } from '../types/task';

// Development-only seeded placeholders. Replace with persistence-backed data later.
export const DEV_SEEDED_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Draft project kickoff notes',
    category: 'Work',
    status: 'Not Started',
    createdAt: '2026-03-25T08:00:00.000Z',
    updatedAt: '2026-03-25T08:00:00.000Z',
    dueDate: '2026-03-30T00:00:00.000Z',
    priority: 4,
  },
  {
    id: 'task-2',
    title: 'Review class reading outline',
    category: 'School',
    status: 'In Progress',
    createdAt: '2026-03-25T09:00:00.000Z',
    updatedAt: '2026-03-25T09:30:00.000Z',
    priority: 3,
  },
  {
    id: 'task-3',
    title: 'Schedule home maintenance check',
    category: 'Home',
    status: 'Not Started',
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z',
  },
];

export const DEV_SEEDED_BORED_TASKS: BoredTask[] = [
  {
    id: 'bored-1',
    title: 'Clean up desktop downloads',
    createdAt: '2026-03-25T11:00:00.000Z',
    completedForInsightCount: false,
  },
  {
    id: 'bored-2',
    title: 'Brainstorm blog post ideas',
    createdAt: '2026-03-25T11:15:00.000Z',
    completedForInsightCount: true,
  },
];
