export type AppEnvironment =
  | { readonly mode: 'demo' }
  | {
      readonly mode: 'remote';
      readonly supabaseUrl: string;
      readonly supabasePublishableKey: string;
    };

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function getAppEnvironment(
  source: EnvironmentSource = process.env,
): AppEnvironment {
  const supabaseUrl = source.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey =
    source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    return { mode: 'demo' };
  }

  return {
    mode: 'remote',
    supabaseUrl,
    supabasePublishableKey,
  };
}

export const appEnvironment = getAppEnvironment();
