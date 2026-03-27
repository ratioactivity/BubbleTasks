import type { Task } from '../types/task';

const toTimestamp = (value?: string): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const compareByCreatedAt = (a: Task, b: Task): number => {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

export const sortTasks = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    const dueA = toTimestamp(a.dueDate);
    const dueB = toTimestamp(b.dueDate);

    if (dueA !== null && dueB !== null) {
      if (dueA !== dueB) {
        return dueA - dueB;
      }

      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      return compareByCreatedAt(a, b);
    }

    if (dueA !== null) {
      return -1;
    }

    if (dueB !== null) {
      return 1;
    }

    return compareByCreatedAt(a, b);
  });
};
