import { supabaseClient } from '../../lib/supabaseClient';
import type { BoredTask, Task } from '../../types/task';
import type { PersistedSettings, PersistedState, TasksRepository } from './types';

interface TaskRow {
  id: string;
  title: string;
  category: Task['category'];
  status: Task['status'];
  due_date: string | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

interface BoredTaskRow {
  id: string;
  title: string;
  created_at: string;
}

interface SettingRow {
  key: string;
  value: PersistedSettings;
}

const defaultSettings: PersistedSettings = {
  completionEvents: [],
  layoutMode: 'board',
};

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  category: row.category,
  status: row.status,
  dueDate: row.due_date ?? undefined,
  priority: row.priority ? (row.priority as 1 | 2 | 3 | 4 | 5) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toTaskRow = (task: Task, archived: boolean): TaskRow => ({
  id: task.id,
  title: task.title,
  category: task.category,
  status: task.status,
  due_date: task.dueDate ?? null,
  priority: task.priority ?? null,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
  archived,
});

const toBoredTask = (row: BoredTaskRow): BoredTask => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
});

const toBoredTaskRow = (task: BoredTask): BoredTaskRow => ({
  id: task.id,
  title: task.title,
  created_at: task.createdAt,
});

export const createSupabaseRepository = (): TasksRepository => {
  if (!supabaseClient) {
    throw new Error('Supabase client not configured');
  }

  return {
    mode: 'supabase',
    loadState: async (): Promise<PersistedState | null> => {
      const [tasksResult, boredResult, settingsResult] = await Promise.all([
        supabaseClient.from('tasks').select('*'),
        supabaseClient.from('bored_tasks').select('*'),
        supabaseClient.from('settings').select('*').eq('key', 'app_settings').maybeSingle(),
      ]);

      if (tasksResult.error || boredResult.error || settingsResult.error) {
        throw new Error('Failed to load state from Supabase');
      }

      const taskRows = (tasksResult.data ?? []) as TaskRow[];
      const boredRows = (boredResult.data ?? []) as BoredTaskRow[];
      const settingRow = settingsResult.data as SettingRow | null;

      return {
        tasks: taskRows.filter((row) => !row.archived).map(toTask),
        archivedTasks: taskRows.filter((row) => row.archived).map(toTask),
        boredTasks: boredRows.map(toBoredTask),
        settings: settingRow?.value ?? defaultSettings,
      };
    },
    upsertTask: async (task, archived) => {
      const { error } = await supabaseClient.from('tasks').upsert(toTaskRow(task, archived));

      if (error) {
        throw error;
      }
    },
    deleteTask: async (taskId) => {
      const { error } = await supabaseClient.from('tasks').delete().eq('id', taskId);

      if (error) {
        throw error;
      }
    },
    upsertBoredTask: async (task) => {
      const { error } = await supabaseClient.from('bored_tasks').upsert(toBoredTaskRow(task));

      if (error) {
        throw error;
      }
    },
    deleteBoredTask: async (taskId) => {
      const { error } = await supabaseClient.from('bored_tasks').delete().eq('id', taskId);

      if (error) {
        throw error;
      }
    },
    saveSettings: async (settings) => {
      const { error } = await supabaseClient.from('settings').upsert({ key: 'app_settings', value: settings });

      if (error) {
        throw error;
      }
    },
  };
};
