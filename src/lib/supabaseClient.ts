import { createClient } from '@supabase/supabase-js';
import { appEnv, isSupabaseEnvConfigured } from '../config/env';

export const isSupabaseConfigured = isSupabaseEnvConfigured;

export const supabaseClient = isSupabaseConfigured
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey)
  : null;
