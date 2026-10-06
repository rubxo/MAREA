import Constants from 'expo-constants';

export type AppEnvironment =
  | { readonly mode: 'unconfigured' }
  | {
      readonly mode: 'remote';
      readonly supabaseUrl: string;
      readonly supabasePublishableKey: string;
    };

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function resolveSupabaseUrl(rawUrl: string): string {
  if (rawUrl.startsWith('https://')) return rawUrl;
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return rawUrl;
  const metroHost = hostUri.split(':')[0];
  if (metroHost && /^(\d{1,3}\.){3}\d{1,3}$/.test(metroHost)) {
    return rawUrl.replace(/^http:\/\/[^:/]+(:[0-9]+)?/, `http://${metroHost}$1`);
  }
  return rawUrl;
}

export function getAppEnvironment(
  source: EnvironmentSource = process.env,
): AppEnvironment {
  const rawUrl = source.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey =
    source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!rawUrl || !supabasePublishableKey) {
    return { mode: 'unconfigured' };
  }

  const supabaseUrl = resolveSupabaseUrl(rawUrl);

  return {
    mode: 'remote',
    supabaseUrl,
    supabasePublishableKey,
  };
}

// Expo only substitutes literal EXPO_PUBLIC variable accesses.
export const appEnvironment = getAppEnvironment({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
