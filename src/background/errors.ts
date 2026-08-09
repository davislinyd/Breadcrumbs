import type { AppError } from '../domain/types';

export class AppFailure extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppFailure';
    this.code = code;
  }

  toJSON(): AppError {
    return { code: this.code, message: this.message };
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppFailure) return error.toJSON();
  if (error instanceof Error) return { code: 'error', message: error.message };
  return { code: 'error', message: 'Unknown error' };
}
