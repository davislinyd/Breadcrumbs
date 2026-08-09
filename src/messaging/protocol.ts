import type {
  AppError,
  AppSettings,
  AuditEntry,
  BackupPayload,
  CookieCollection,
  CookieRecord,
  DisabledCookie,
  DisableResult,
  ImportPreview,
  ImportResult,
  RestoreResult,
} from '../domain/types';

export type BgRequest =
  | { type: 'list'; url?: string }
  | { type: 'settings' }
  | { type: 'saveSettings'; settings: AppSettings }
  | { type: 'collections' }
  | { type: 'saveCollections'; collections: CookieCollection[] }
  | { type: 'disabled' }
  | { type: 'audit' }
  | { type: 'delete'; cookie: CookieRecord }
  | { type: 'deleteMany'; cookies: CookieRecord[]; site: string }
  | { type: 'disable'; cookies: CookieRecord[]; dueAt?: number }
  | { type: 'restore'; ids: string[]; force?: boolean }
  | { type: 'expiry'; cookie: CookieRecord; expirationDate?: number }
  | { type: 'backup' }
  | { type: 'import'; payload: BackupPayload; commit: boolean; force?: boolean }
  | { type: 'nativeStatus' }
  | { type: 'syncSnapshot' };

export type BgResultMap = {
  list: CookieRecord[];
  settings: AppSettings;
  saveSettings: true;
  collections: CookieCollection[];
  saveCollections: true;
  disabled: DisabledCookie[];
  audit: AuditEntry[];
  delete: true;
  deleteMany: { deleted: number };
  disable: DisableResult;
  restore: RestoreResult;
  expiry: true;
  backup: BackupPayload;
  import: ImportPreview | ImportResult;
  nativeStatus: { available: boolean; updatedAt?: number };
  syncSnapshot: true;
};

export type BgResponse<T> = { ok: true; value: T } | { ok: false; error: AppError };

export const NATIVE_HOST = 'dev.breadcrumbs.host';

export type NativeAction = 'status' | 'snapshot' | 'vaultPut' | 'vaultGet' | 'vaultList' | 'vaultDelete';

export type NativeOk =
  | {
      ok: true;
      available?: boolean;
      updatedAt?: number;
      stored?: boolean;
      deleted?: boolean;
      entry?: unknown;
      entries?: unknown[];
    }
  | { ok: false; error: string; code?: string };
