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
  activeStoreId?: string;
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

export const cookieKey = (cookie: Pick<CookieRecord, 'storeId' | 'name' | 'domain' | 'path' | 'partitionKey'>): CookieKey =>
  [cookie.storeId, cookie.name, cookie.domain, cookie.path, JSON.stringify(cookie.partitionKey ?? null)].join('\u001f');

export const toRecord = (cookie: chrome.cookies.Cookie): CookieRecord => {
  const record: CookieRecord = {
    key: '', name: cookie.name, value: cookie.value, domain: cookie.domain, path: cookie.path,
    storeId: cookie.storeId, hostOnly: cookie.hostOnly, httpOnly: cookie.httpOnly, secure: cookie.secure,
    sameSite: cookie.sameSite, session: cookie.session, expirationDate: cookie.expirationDate,
    partitionKey: cookie.partitionKey,
  };
  record.key = cookieKey(record);
  return record;
};

export const cookieUrl = (cookie: Pick<CookieRecord, 'domain' | 'path' | 'secure'>) =>
  `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path || '/'}`;

export const rawCookie = (cookie: CookieRecord) => `${cookie.name}=${cookie.value}`;

export const setCookieText = (cookie: CookieRecord) => [
  rawCookie(cookie),
  `Path=${cookie.path}`,
  !cookie.hostOnly && `Domain=${cookie.domain}`,
  cookie.expirationDate && `Expires=${new Date(cookie.expirationDate * 1000).toUTCString()}`,
  cookie.secure && 'Secure',
  cookie.httpOnly && 'HttpOnly',
  cookie.sameSite !== 'unspecified' && `SameSite=${cookie.sameSite === 'no_restriction' ? 'None' : cookie.sameSite[0].toUpperCase() + cookie.sameSite.slice(1)}`,
].filter(Boolean).join('; ');
