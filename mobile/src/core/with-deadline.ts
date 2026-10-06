import { AppError } from './errors/app-error';

// Reject independently of transport cancellation: native requests may ignore abort.
export async function withDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  message: string,
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError('NETWORK', message, true));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
