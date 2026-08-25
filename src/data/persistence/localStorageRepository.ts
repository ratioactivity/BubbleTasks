import type { PersistedSettings, PersistedState, TasksRepository } from './types';
import { normalizeCategoryKey, type BoredTask, type Task } from '../../types/task';

const STORAGE_KEY = 'bubbletasks_state_v1';

interface LocalStorageShape {
  tasks: Task[];
  archivedTasks: Task[];
  boredTasks: BoredTask[];
  settings: PersistedSettings;
}

const defaultSettings: PersistedSettings = {
  completionEvents: [],
  layoutMode: 'board',
};

const read = (): LocalStorageShape | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as LocalStorageShape;
    return {
      tasks: (parsed.tasks ?? []).map((task) => ({ ...task, category: normalizeCategoryKey(task.category) })),
      archivedTasks: (parsed.archivedTasks ?? []).map((task) => ({ ...task, category: normalizeCategoryKey(task.category) })),
      boredTasks: parsed.boredTasks ?? [],
      settings: parsed.settings ?? defaultSettings,
    };
  } catch {
    return null;
  }
};

const write = (nextState: LocalStorageShape) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
};

const update = (updater: (state: LocalStorageShape) => LocalStorageShape) => {
  const current =
    read() ?? {
      tasks: [],
      archivedTasks: [],
      boredTasks: [],
      settings: defaultSettings,
    };

  write(updater(current));
};

export const createLocalStorageRepository = (): TasksRepository => {
  return {
    mode: 'local',
    loadState: async (): Promise<PersistedState | null> => {
      const data = read();
      return data ? { ...data } : null;
    },
    upsertTask: async (task, archived) => {
      update((state) => {
        const activePool = archived ? state.archivedTasks : state.tasks;
        const oppositePool = archived ? state.tasks : state.archivedTasks;
        const filteredActive = activePool.filter((item) => item.id !== task.id);
        const filteredOpposite = oppositePool.filter((item) => item.id !== task.id);

        return archived
          ? {
              ...state,
              tasks: filteredOpposite,
              archivedTasks: [task, ...filteredActive],
            }
          : {
              ...state,
              tasks: [task, ...filteredActive],
              archivedTasks: filteredOpposite,
            };
      });
    },
    deleteTask: async (taskId) => {
      update((state) => ({
        ...state,
        tasks: state.tasks.filter((task) => task.id !== taskId),
        archivedTasks: state.archivedTasks.filter((task) => task.id !== taskId),
      }));
    },
    upsertBoredTask: async (task) => {
      update((state) => ({
        ...state,
        boredTasks: [...state.boredTasks.filter((item) => item.id !== task.id), task],
      }));
    },
    deleteBoredTask: async (taskId) => {
      update((state) => ({
        ...state,
        boredTasks: state.boredTasks.filter((task) => task.id !== taskId),
      }));
    },
    saveSettings: async (settings) => {
      update((state) => ({
        ...state,
        settings,
      }));
    },
  };
};
