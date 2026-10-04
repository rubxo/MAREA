import { AppError } from '@/core/errors/app-error';

export function getErrorMessage(error: unknown): string {
  return error instanceof AppError
    ? error.message
    : 'No pudimos completar la acción. Inténtalo nuevamente.';
}

