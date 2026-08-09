export type CookieKey = string;

export interface CookieRecord {
  key: CookieKey;
  name: string;
  value: string;
  domain: string;
  path: string;
  storeId: string;
  hostOnly: boolean;
  httpOnly: boolean;
  secure: boolean;
  sameSite: chrome.cookies.Cookie['sameSite'];
  session: boolean;
  expirationDate?: number;
  partitionKey?: chrome.cookies.CookiePartitionKey;
}

export interface CookieCollection {
  id: string;
  label: string;
  color: string;
  keys: CookieKey[];
}

export interface DisabledCookie {
  id: string;
  cookie: CookieRecord;
  dueAt?: number;
  disabledAt: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  action: 'delete' | 'delete-site' | 'disable' | 'restore' | 'expiry';
  key: CookieKey;
  summary: string;
  undo?: DisabledCookie;
}

export interface AppSettings {
  defaultView: 'Domain' | 'FQDN' | 'URL';
}

export interface BackupPayload {
  version: 1;
  exportedAt: number;
  cookies: CookieRecord[];
  collections: CookieCollection[];
  disabled: DisabledCookie[];
  audit: AuditEntry[];
}

export interface BackupEnvelope {
  format: 'breadcrumbs';
  version: 1;
  kdf: { algorithm: 'argon2id'; salt: string; iterations: number; memoryKiB: number; parallelism: number };
  cipher: { algorithm: 'AES-256-GCM'; nonce: string; ciphertext: string };
}

export interface AppError {
  code: string;
  message: string;
}

export interface DisableResult {
  succeeded: DisabledCookie[];
  failed: { key: CookieKey; error: AppError }[];
}

export interface RestoreResult {
  restored: number;
  conflicts: DisabledCookie[];
}

export interface ImportPreview {
  eligible: number;
  conflicts: CookieKey[];
}

export interface ImportResult extends ImportPreview {
  committed: boolean;
}
