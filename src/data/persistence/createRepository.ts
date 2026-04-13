import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { createLocalStorageRepository } from './localStorageRepository';
import { createSupabaseRepository } from './supabaseRepository';
import type { TasksRepository } from './types';

export const createRepository = (): TasksRepository => {
  if (isSupabaseConfigured) {
    return createSupabaseRepository();
  }

  return createLocalStorageRepository();
};
