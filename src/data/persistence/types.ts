import type { BoredTask, CompletionEvent, LayoutMode, Task } from '../../types/task';

export interface PersistedSettings {
  completionEvents: CompletionEvent[];
  layoutMode: LayoutMode;
}

export interface PersistedState {
  tasks: Task[];
  archivedTasks: Task[];
  boredTasks: BoredTask[];
  settings: PersistedSettings;
}

export interface TasksRepository {
  mode: 'supabase' | 'local';
  loadState: () => Promise<PersistedState | null>;
  upsertTask: (task: Task, archived: boolean) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  upsertBoredTask: (task: BoredTask) => Promise<void>;
  deleteBoredTask: (taskId: string) => Promise<void>;
  saveSettings: (settings: PersistedSettings) => Promise<void>;
}
