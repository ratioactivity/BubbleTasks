interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appBaseUrl: string;
}

const readEnv = (): AppEnv => {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    appBaseUrl: import.meta.env.VITE_APP_BASE_URL ?? '',
  };
};

export const appEnv = readEnv();

export const isSupabaseEnvConfigured = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
