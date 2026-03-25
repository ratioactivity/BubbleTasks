import { useMemo, useState } from 'react';
import {
  DEV_SEEDED_ARCHIVED_TASKS,
  DEV_SEEDED_BORED_TASKS,
  DEV_SEEDED_COMPLETION_EVENTS,
  DEV_SEEDED_TASKS,
} from '../data/seeds';
import type { BoredTask, CategoryKey, CompletionEvent, LayoutMode, Task, TaskDraft, TaskStatus } from '../types/task';
import { CATEGORY_ORDER } from '../config/categories';
import { sortTasks } from '../utils/sortTasks';

const createId = (prefix: string): string => {
  return `${prefix}-${crypto.randomUUID()}`;
};

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  return startOfDay(start);
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1);

const countSince = (events: CompletionEvent[], from: Date): number => {
  const fromTime = from.getTime();
  return events.filter((event) => new Date(event.occurredAt).getTime() >= fromTime).length;
};

export const useBubbleTasksState = () => {
  const [tasks, setTasks] = useState<Task[]>(DEV_SEEDED_TASKS);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>(DEV_SEEDED_ARCHIVED_TASKS);
  const [boredTasks, setBoredTasks] = useState<BoredTask[]>(DEV_SEEDED_BORED_TASKS);
  const [completionEvents, setCompletionEvents] = useState<CompletionEvent[]>(DEV_SEEDED_COMPLETION_EVENTS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('board');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(CATEGORY_ORDER[0]);

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);

  const tasksByCategory = useMemo(() => {
    const grouped = CATEGORY_ORDER.reduce<Record<CategoryKey, Task[]>>((acc, key) => {
      acc[key] = [];
      return acc;
    }, {} as Record<CategoryKey, Task[]>);

    sortedTasks.forEach((task) => {
      grouped[task.category].push(task);
    });

    return grouped;
  }, [sortedTasks]);

  const now = new Date();
  const completionSummary = {
    today: countSince(completionEvents, startOfDay(now)),
    week: countSince(completionEvents, startOfWeek(now)),
    month: countSince(completionEvents, startOfMonth(now)),
    year: countSince(completionEvents, startOfYear(now)),
  };

  const addTask = (draft: TaskDraft) => {
    const nowIso = new Date().toISOString();
    const task: Task = {
      id: createId('task'),
      title: draft.title.trim(),
      category: draft.category,
      status: 'not_started',
      createdAt: nowIso,
      updatedAt: nowIso,
      dueDate: draft.dueDate,
      priority: draft.priority,
    };

    setTasks((prev) => [...prev, task]);
  };

  const updateTask = (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const trackCompletion = (taskId: string, mode: CompletionEvent['mode']) => {
    const event: CompletionEvent = {
      id: createId('completion'),
      taskId,
      occurredAt: new Date().toISOString(),
      mode,
    };

    setCompletionEvents((prev) => [...prev, event]);
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    updateTask(taskId, { status });

    if (status === 'complete') {
      completeAndArchiveTask(taskId);
    }
  };

  const completeAndArchiveTask = (taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((item) => item.id === taskId);

      if (!task) {
        return prev;
      }

      const completedTask: Task = {
        ...task,
        status: 'complete',
        updatedAt: new Date().toISOString(),
      };

      setArchivedTasks((archived) => [completedTask, ...archived]);
      trackCompletion(taskId, 'archived_complete');

      return prev.filter((item) => item.id !== taskId);
    });
  };

  const countAsCompletedKeepVisible = (taskId: string) => {
    trackCompletion(taskId, 'count_only');
  };

  const restoreArchivedTask = (taskId: string) => {
    setArchivedTasks((prev) => {
      const task = prev.find((item) => item.id === taskId);

      if (!task) {
        return prev;
      }

      const restoredTask: Task = {
        ...task,
        status: 'not_started',
        updatedAt: new Date().toISOString(),
      };

      setTasks((active) => [...active, restoredTask]);
      return prev.filter((item) => item.id !== taskId);
    });
  };

  const clearArchive = () => {
    setArchivedTasks([]);
  };

  const addBoredTask = (title: string) => {
    const trimmed = title.trim();

    if (!trimmed) {
      return;
    }

    setBoredTasks((prev) => [
      ...prev,
      {
        id: createId('bored'),
        title: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const removeBoredTask = (id: string) => {
    setBoredTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return {
    tasks,
    tasksByCategory,
    archivedTasks: sortTasks(archivedTasks),
    boredTasks,
    completionSummary,
    layoutMode,
    activeCategory,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    completeAndArchiveTask,
    countAsCompletedKeepVisible,
    restoreArchivedTask,
    clearArchive,
    addBoredTask,
    removeBoredTask,
    setLayoutMode,
    setActiveCategory,
  };
};
