import { uploadLocalPhoto } from './upload-photo';

afterEach(() => jest.useRealTimers());

it('times out while waiting for authentication, before the upload starts', async () => {
  jest.useFakeTimers();
  let finishSession!: (value: typeof session) => void;
  const request = jest.fn();
  const pending = uploadLocalPhoto(
    { bucket: 'avatars', path: 'user-1/photo.jpg', uri: 'file:///portrait.jpg' },
    { getSession: () => new Promise(resolve => { finishSession = resolve; }),
      createFile: () => ({}) as never, request: request as never,
      baseUrl: 'http://localhost:55321', apiKey: 'public-key', timeoutMs: 100 },
  );
  const rejection = expect(pending).rejects.toThrow('La subida tardó demasiado');
  await jest.advanceTimersByTimeAsync(101);
  await rejection;
  finishSession(session);
  await Promise.resolve();
  expect(request).not.toHaveBeenCalled();
});

it('releases the caller even when the native transport ignores abort', async () => {
  jest.useFakeTimers();
  const pending = uploadLocalPhoto(
    { bucket: 'avatars', path: 'user-1/photo.jpg', uri: 'file:///portrait.jpg' },
    { getSession: async () => session, createFile: () => ({}) as never,
      request: jest.fn(() => new Promise(() => {})) as never,
      baseUrl: 'http://localhost:55321', apiKey: 'public-key', timeoutMs: 100 },
  );
  const rejection = expect(pending).rejects.toThrow('La subida tardó demasiado');
  await jest.advanceTimersByTimeAsync(101);
  await rejection;
});

const session = {
  access_token: 'user-token', token_type: 'bearer', expires_in: 3600, expires_at: 1,
  refresh_token: 'refresh', user: { id: 'user-1' },
} as never;

it('streams the native file to the authenticated and encoded Storage URL', async () => {
  const body = { uri: 'file:///portrait.jpg' };
  const request = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  await uploadLocalPhoto(
    { bucket: 'avatars', path: 'user-1/foto nueva.jpg', uri: 'file:///portrait.jpg' },
    {
      getSession: async () => session,
      createFile: () => body as never,
      request: request as never,
      baseUrl: 'http://192.168.1.24:55321/',
      apiKey: 'public-key',
      timeoutMs: 5_000,
    },
  );

  expect(request).toHaveBeenCalledWith(
    'http://192.168.1.24:55321/storage/v1/object/avatars/user-1/foto%20nueva.jpg',
    expect.objectContaining({
      method: 'POST', body,
      headers: expect.objectContaining({ Authorization: 'Bearer user-token', apikey: 'public-key', 'Content-Type': 'image/jpeg' }),
    }),
  );
});

it('aborts an upload that stops responding instead of waiting forever', async () => {
  jest.useFakeTimers();
  const request = jest.fn((_url: string, init: { signal: AbortSignal }) =>
    new Promise<Response>((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
  const pending = uploadLocalPhoto(
    { bucket: 'avatars', path: 'user-1/photo.jpg', uri: 'file:///portrait.jpg' },
    { getSession: async () => session, createFile: () => ({}) as never, request: request as never,
      baseUrl: 'http://localhost:55321', apiKey: 'public-key', timeoutMs: 30_000 },
  );
  const rejection = expect(pending).rejects.toThrow('La subida tardó demasiado');
  await jest.advanceTimersByTimeAsync(30_001);
  await rejection;
});
