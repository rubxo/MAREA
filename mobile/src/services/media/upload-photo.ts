import { fetch as expoFetch } from 'expo/fetch';
import type { Session } from '@supabase/supabase-js';

import { appEnvironment } from '@/core/config/env';
import { AppError } from '@/core/errors/app-error';
import { withDeadline } from '@/core/with-deadline';

import { createPhotoUploadBody } from './photo-upload-body';

type UploadPhotoInput = Readonly<{
  bucket: string;
  path: string;
  uri: string;
}>;

type UploadDependencies = Readonly<{
  getSession: () => Promise<Session | null>;
  createFile: (uri: string) => BodyInit | Promise<BodyInit>;
  request: typeof expoFetch;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}>;

function encodeStoragePath(bucket: string, path: string): string {
  return [bucket, ...path.split('/')].map(encodeURIComponent).join('/');
}

async function defaultDependencies(): Promise<UploadDependencies> {
  const { getSupabaseClient } = await import('@/data/remote/supabase-client');
  const client = getSupabaseClient();
  if (!client || appEnvironment.mode !== 'remote') {
    throw new AppError('NETWORK', 'Supabase no está configurado.');
  }

  return {
    getSession: async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw new AppError('AUTH_REQUIRED', 'No pudimos validar tu sesión.');
      return data.session;
    },
    createFile: createPhotoUploadBody,
    // Browser fetch depends on its Window receiver; the wrapper keeps it out of an object method call.
    request: (input, init) => expoFetch(input, init),
    baseUrl: appEnvironment.supabaseUrl,
    apiKey: appEnvironment.supabasePublishableKey,
    timeoutMs: 30_000,
  };
}

export async function uploadLocalPhoto(
  input: UploadPhotoInput,
  overrides?: UploadDependencies,
): Promise<void> {
  const dependencies = overrides ?? await defaultDependencies();
  return withDeadline(async (signal) => {
  const session = await dependencies.getSession();
  if (signal.aborted) return;
  if (!session) throw new AppError('AUTH_REQUIRED', 'Tu sesión expiró. Inicia sesión nuevamente.');

  try {
    const root = dependencies.baseUrl.replace(/\/$/, '');
    const response = await dependencies.request(
      `${root}/storage/v1/object/${encodeStoragePath(input.bucket, input.path)}`,
      {
        method: 'POST',
        body: await dependencies.createFile(input.uri),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: dependencies.apiKey,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false',
          'cache-control': '3600',
        },
        signal,
      },
    );

    if (response.ok || response.status === 409) return;
    if (response.status === 401) {
      throw new AppError('AUTH_REQUIRED', 'Tu sesión expiró. Inicia sesión nuevamente.');
    }
    if (response.status === 403) {
      throw new AppError('FORBIDDEN', 'No tienes permiso para subir esta foto.');
    }
    throw new AppError(
      'NETWORK',
      `No pudimos subir la foto (Storage ${response.status}). Inténtalo nuevamente.`,
      true,
    );
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new AppError(
        'NETWORK',
        'La subida tardó demasiado. Revisa tu conexión e inténtalo de nuevo.',
        true,
      );
    }
    if (error instanceof AppError) throw error;
    throw new AppError('NETWORK', 'No pudimos subir la foto. Revisa tu conexión.', true);
  }
  }, 'La subida tardó demasiado. Revisa tu conexión e inténtalo de nuevo.', dependencies.timeoutMs);
}

export function uploadPhoto(bucket: string, path: string, uri: string): Promise<void> {
  return uploadLocalPhoto({ bucket, path, uri });
}
