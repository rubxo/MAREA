import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { appEnvironment, AppEnvironment } from '@/core/config/env';
import { authStorage } from '@/data/local/auth-storage';

import { Database } from './database.types';

export type MareaSupabaseClient = SupabaseClient<Database>;

let singleton: MareaSupabaseClient | null | undefined;
let refreshListenerInstalled = false;
const webGlobals = globalThis as typeof globalThis & {
  __mareaSupabaseClient?: MareaSupabaseClient;
};

function installRefreshLifecycle(client: MareaSupabaseClient): void {
  if (refreshListenerInstalled || Platform.OS === 'web') return;
  refreshListenerInstalled = true;

  if (AppState.currentState === 'active') client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();

  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}

export function createSupabaseClient(environment: Extract<AppEnvironment, { mode: 'remote' }>) {
  const client = createClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        flowType: 'pkce',
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: { headers: { 'x-client-info': 'marea-expo/1.0' } },
    },
  );
  installRefreshLifecycle(client);
  return client;
}

export function getSupabaseClient(
  environment: AppEnvironment = appEnvironment,
): MareaSupabaseClient | null {
  if (environment.mode !== 'remote') return null;
  if (Platform.OS === 'web') {
    webGlobals.__mareaSupabaseClient ??= createSupabaseClient(environment);
    return webGlobals.__mareaSupabaseClient;
  }
  singleton ??= createSupabaseClient(environment);
  return singleton;
}
