import { useEffect, useMemo, useState } from 'react';
import {
  DEV_SEEDED_ARCHIVED_TASKS,
  DEV_SEEDED_BORED_TASKS,
  DEV_SEEDED_COMPLETION_EVENTS,
  DEV_SEEDED_TASKS,
} from '../data/seeds';
import type { BoredTask, CategoryKey, CompletionEvent, LayoutMode, Task, TaskDraft, TaskStatus } from '../types/task';
import { CATEGORY_ORDER } from '../config/categories';
import { sortTasks } from '../utils/sortTasks';
import { createRepository } from '../data/persistence/createRepository';
import type { PersistedSettings, TasksRepository } from '../data/persistence/types';

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
  const [repository] = useState<TasksRepository>(createRepository());
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(DEV_SEEDED_TASKS);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>(DEV_SEEDED_ARCHIVED_TASKS);
  const [boredTasks, setBoredTasks] = useState<BoredTask[]>(DEV_SEEDED_BORED_TASKS);
  const [completionEvents, setCompletionEvents] = useState<CompletionEvent[]>(DEV_SEEDED_COMPLETION_EVENTS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('board');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(CATEGORY_ORDER[0]);

  useEffect(() => {
    repository
      .loadState()
      .then((persisted) => {
        if (!persisted) {
          setIsHydrated(true);
          return;
        }

        setTasks(persisted.tasks);
        setArchivedTasks(persisted.archivedTasks);
        setBoredTasks(persisted.boredTasks);
        setCompletionEvents(persisted.settings.completionEvents ?? []);
        setLayoutMode(persisted.settings.layoutMode ?? 'board');
        setIsHydrated(true);
      })
      .catch(() => {
        setPersistenceError('Unable to load remote data. Using local in-memory state.');
        setIsHydrated(true);
      });
  }, [repository]);

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

  const reportPersistenceError = (message: string) => {
    setPersistenceError(message);
    console.log('✅ script validated');
  };

  const persistSettings = (nextSettings: PersistedSettings) => {
    repository.saveSettings(nextSettings).catch(() => {
      reportPersistenceError('Unable to save settings right now.');
    });
  };

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
    repository.upsertTask(task, false).catch(() => {
      reportPersistenceError('Unable to save task right now.');
    });
  };

  const updateTask = (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const nextTask = {
          ...task,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        repository.upsertTask(nextTask, false).catch(() => {
          reportPersistenceError('Unable to update task right now.');
        });

        return nextTask;
      }),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    repository.deleteTask(taskId).catch(() => {
      reportPersistenceError('Unable to delete task right now.');
    });
  };

  const trackCompletion = (taskId: string, mode: CompletionEvent['mode']) => {
    const event: CompletionEvent = {
      id: createId('completion'),
      taskId,
      occurredAt: new Date().toISOString(),
      mode,
    };

    setCompletionEvents((prev) => {
      const nextEvents = [...prev, event];
      persistSettings({ completionEvents: nextEvents, layoutMode });
      return nextEvents;
    });
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    if (status === 'complete') {
      completeAndArchiveTask(taskId);
      return;
    }

    updateTask(taskId, { status });
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
      repository.upsertTask(completedTask, true).catch(() => {
        reportPersistenceError('Unable to sync archived task right now.');
      });
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
      repository.upsertTask(restoredTask, false).catch(() => {
        reportPersistenceError('Unable to sync restored task right now.');
      });

      return prev.filter((item) => item.id !== taskId);
    });
  };

  const clearArchive = () => {
    setArchivedTasks((prev) => {
      prev.forEach((task) => {
        repository.deleteTask(task.id).catch(() => {
          reportPersistenceError('Unable to clear archive item right now.');
        });
      });

      return [];
    });
  };

  const addBoredTask = (title: string) => {
    const trimmed = title.trim();

    if (!trimmed) {
      return;
    }

    const nextTask: BoredTask = {
      id: createId('bored'),
      title: trimmed,
      createdAt: new Date().toISOString(),
    };

    setBoredTasks((prev) => [...prev, nextTask]);
    repository.upsertBoredTask(nextTask).catch(() => {
      reportPersistenceError('Unable to save bored-list task right now.');
    });
  };

  const removeBoredTask = (id: string) => {
    setBoredTasks((prev) => prev.filter((task) => task.id !== id));
    repository.deleteBoredTask(id).catch(() => {
      reportPersistenceError('Unable to delete bored-list task right now.');
    });
  };

  const updateLayoutMode = (nextMode: LayoutMode) => {
    setLayoutMode(nextMode);
    persistSettings({ completionEvents, layoutMode: nextMode });
  };

  return {
    repositoryMode: repository.mode,
    persistenceError,
    isHydrated,
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
    setLayoutMode: updateLayoutMode,
    setActiveCategory,
  };
};
