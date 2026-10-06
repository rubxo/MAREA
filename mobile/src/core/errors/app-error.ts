export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'VALIDATION'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

type RemoteErrorLike = Readonly<{ message?: string; code?: string; status?: number }>;

export function toAppError(error: RemoteErrorLike): AppError {
  const normalized = error.message?.toLowerCase() ?? '';
  if (normalized.includes('invalid login')) {
    return new AppError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }
  if (error.code === '23505' || normalized.includes('duplicate')) {
    return new AppError('CONFLICT', 'Ese nombre de usuario ya está en uso.');
  }
  if (error.status === 422 && normalized.includes('already registered')) {
    return new AppError('CONFLICT', 'Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.');
  }
  if (error.status === 422) {
    return new AppError('VALIDATION', 'No pudimos crear la cuenta con esos datos. Revisa el correo, usuario y contraseña.');
  }
  if (error.status === 401) return new AppError('AUTH_REQUIRED', 'Tu sesión expiró.');
  if (error.status === 403 || error.code === '42501') {
    return new AppError('FORBIDDEN', 'No tienes permiso para realizar esta acción.');
  }
  if (error.status === 0 || normalized.includes('network') || normalized.includes('fetch')) {
    return new AppError('NETWORK', 'No pudimos conectar. Revisa tu conexión.', true);
  }
  return new AppError('UNKNOWN', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
}
