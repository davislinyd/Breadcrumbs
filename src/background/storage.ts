import type { AppSettings, AuditEntry, CookieCollection, DisabledCookie } from '../domain/types';

export const STORAGE = {
  collections: 'collections',
  disabled: 'disabled',
  audit: 'audit',
  settings: 'settings',
} as const;

export async function getStored<T>(key: string, fallback: T): Promise<T> {
  const value = (await chrome.storage.local.get(key))[key] as T | undefined;
  return value ?? fallback;
}

export async function setStored(values: Record<string, unknown>) {
  await chrome.storage.local.set(values);
}

export const defaultSettings = (): AppSettings => ({ defaultView: 'Domain' });

export async function loadSettings() {
  return getStored<AppSettings>(STORAGE.settings, defaultSettings());
}

export async function loadCollections() {
  return getStored<CookieCollection[]>(STORAGE.collections, []);
}

export async function loadDisabled() {
  return getStored<DisabledCookie[]>(STORAGE.disabled, []);
}

export async function loadAudit() {
  return getStored<AuditEntry[]>(STORAGE.audit, []);
}
