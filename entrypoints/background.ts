import { defineBackground } from 'wxt/utils/define-background';
import type { AppSettings, AuditEntry, BackupPayload, CookieCollection, CookieRecord, DisabledCookie } from '../src/types';
import { cookieKey, cookieUrl, toRecord } from '../src/types';

const NATIVE_HOST = 'dev.breadcrumbs.host';
const STORAGE = { collections: 'collections', disabled: 'disabled', audit: 'audit', settings: 'settings' } as const;

const getStored = async <T>(key: string, fallback: T): Promise<T> => ((await chrome.storage.local.get(key))[key] as T | undefined) ?? fallback;
const saveAudit = async (entry: AuditEntry) => {
  const audit = await getStored<AuditEntry[]>(STORAGE.audit, []);
  await chrome.storage.local.set({ [STORAGE.audit]: [entry, ...audit].slice(0, 200) });
};
const uid = () => crypto.randomUUID();
const native = <T>(message: object) => chrome.runtime.sendNativeMessage(NATIVE_HOST, message) as Promise<T>;

async function listCookies(url?: string): Promise<CookieRecord[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  const lists = await Promise.all(stores.map(store => chrome.cookies.getAll({ storeId: store.id, ...(url ? { url } : {}) })));
  const records = lists.flat().map(toRecord);
  void syncNativeSnapshot(records);
  return records;
}

async function syncNativeSnapshot(cookies: CookieRecord[]) {
  try {
    const audit = await getStored<AuditEntry[]>(STORAGE.audit, []);
    await chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: 'snapshot', payload: { cookies, audit } });
  } catch {
    // The companion is optional until a vault action or local CLI snapshot is requested.
  }
}

function toSetDetails(cookie: CookieRecord): chrome.cookies.SetDetails {
  return {
    url: cookieUrl(cookie), name: cookie.name, value: cookie.value, domain: cookie.hostOnly ? undefined : cookie.domain,
    path: cookie.path, secure: cookie.secure, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite,
    expirationDate: cookie.session ? undefined : cookie.expirationDate, storeId: cookie.storeId, partitionKey: cookie.partitionKey,
  };
}

async function removeCookie(cookie: CookieRecord) {
  return chrome.cookies.remove({ url: cookieUrl(cookie), name: cookie.name, storeId: cookie.storeId, partitionKey: cookie.partitionKey });
}

async function disable(cookies: CookieRecord[], dueAt?: number) {
  const disabled = await getStored<DisabledCookie[]>(STORAGE.disabled, []);
  const entries = cookies.map(cookie => ({ id: uid(), cookie, dueAt, disabledAt: Date.now() }));
  for (const entry of entries) {
    const result = await native<{ stored?: boolean }>({ action: 'vaultPut', id: entry.id, payload: entry });
    if (!result.stored) throw new Error('Unable to encrypt the isolation vault entry');
  }
  for (const entry of entries) await removeCookie(entry.cookie);
  const index = entries.map(entry => ({ ...entry, cookie: { ...entry.cookie, value: '' } }));
  await chrome.storage.local.set({ [STORAGE.disabled]: [...disabled, ...index] });
  for (const entry of entries) {
    if (dueAt) await chrome.alarms.create(`restore:${entry.id}`, { when: dueAt });
    await saveAudit({ id: uid(), at: Date.now(), action: 'disable', key: entry.cookie.key, summary: `Temporarily disabled ${entry.cookie.name}`, undo: entry });
  }
  return entries;
}

async function restore(ids: string[], force = false) {
  const disabled = await getStored<DisabledCookie[]>(STORAGE.disabled, []);
  const requested = disabled.filter(entry => ids.includes(entry.id));
  const pending = disabled.filter(entry => !ids.includes(entry.id));
  const conflicts: DisabledCookie[] = [];
  for (const index of requested) {
    const response = await native<{ entry?: DisabledCookie }>({ action: 'vaultGet', id: index.id });
    const entry = response.entry;
    if (!entry) throw new Error('Encrypted isolation entry is unavailable');
    const existing = await chrome.cookies.get({ url: cookieUrl(entry.cookie), name: entry.cookie.name, storeId: entry.cookie.storeId, partitionKey: entry.cookie.partitionKey });
    if (existing && !force) { conflicts.push(entry); continue; }
    await chrome.cookies.set(toSetDetails(entry.cookie));
    await chrome.alarms.clear(`restore:${entry.id}`);
    await native({ action: 'vaultDelete', id: entry.id });
    await saveAudit({ id: uid(), at: Date.now(), action: 'restore', key: entry.cookie.key, summary: `Restored ${entry.cookie.name}` });
  }
  const conflictIndex = conflicts.map(entry => ({ ...entry, cookie: { ...entry.cookie, value: '' } }));
  await chrome.storage.local.set({ [STORAGE.disabled]: [...pending, ...conflictIndex] });
  return { restored: requested.length - conflicts.length, conflicts };
}

async function refreshDueRestores() {
  const disabled = await getStored<DisabledCookie[]>(STORAGE.disabled, []);
  const due = disabled.filter(entry => entry.dueAt && entry.dueAt <= Date.now()).map(entry => entry.id);
  if (due.length) await restore(due);
  for (const entry of disabled.filter(entry => entry.dueAt && entry.dueAt > Date.now())) {
    const alarm = await chrome.alarms.get(`restore:${entry.id}`);
    if (!alarm) await chrome.alarms.create(`restore:${entry.id}`, { when: entry.dueAt! });
  }
}

export default defineBackground(() => {
  void refreshDueRestores();
  chrome.runtime.onStartup.addListener(() => void refreshDueRestores());
  chrome.cookies.onChanged.addListener(() => { void listCookies(); });
  chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name.startsWith('restore:')) void refreshDueRestores(); });
  chrome.runtime.onMessage.addListener((message: { type: string; [key: string]: unknown }, _sender, sendResponse) => {
    const run = async () => {
      switch (message.type) {
        case 'list': return listCookies(message.url as string | undefined);
        case 'settings': {
          const settings = await getStored<AppSettings>(STORAGE.settings, { defaultView: 'Domain' });
          return { defaultView: settings.defaultView };
        }
        case 'saveSettings': {
          const settings = message.settings as AppSettings;
          await chrome.storage.local.set({ [STORAGE.settings]: { defaultView: settings.defaultView } });
          return true;
        }
        case 'collections': return getStored<CookieCollection[]>(STORAGE.collections, []);
        case 'saveCollections': await chrome.storage.local.set({ [STORAGE.collections]: message.collections }); return true;
        case 'disabled': return getStored<DisabledCookie[]>(STORAGE.disabled, []);
        case 'audit': return getStored<AuditEntry[]>(STORAGE.audit, []);
        case 'delete': {
          const cookie = message.cookie as CookieRecord;
          await removeCookie(cookie);
          await saveAudit({ id: uid(), at: Date.now(), action: 'delete', key: cookie.key, summary: `Deleted ${cookie.name}` });
          return true;
        }
        case 'deleteMany': {
          const cookies = message.cookies as CookieRecord[];
          const site = message.site as string;
          for (const cookie of cookies) {
            await removeCookie(cookie);
            await saveAudit({ id: uid(), at: Date.now(), action: 'delete-site', key: cookie.key, summary: `Deleted ${cookie.name} from ${site}` });
          }
          return { deleted: cookies.length };
        }
        case 'disable': return disable(message.cookies as CookieRecord[], message.dueAt as number | undefined);
        case 'restore': return restore(message.ids as string[], Boolean(message.force));
        case 'expiry': {
          const cookie = message.cookie as CookieRecord;
          const expirationDate = message.expirationDate as number | undefined;
          await chrome.cookies.set(toSetDetails({ ...cookie, session: !expirationDate, expirationDate }));
          await saveAudit({ id: uid(), at: Date.now(), action: 'expiry', key: cookie.key, summary: `Changed expiry for ${cookie.name}` });
          return true;
        }
        case 'backup': {
          const [cookies, collections, disabledIndex, audit, vault] = await Promise.all([listCookies(), getStored<CookieCollection[]>(STORAGE.collections, []), getStored<DisabledCookie[]>(STORAGE.disabled, []), getStored<AuditEntry[]>(STORAGE.audit, []), native<{ entries?: DisabledCookie[] }>({ action: 'vaultList' })]);
          const vaultById = new Map((vault.entries ?? []).map(entry => [entry.id, entry]));
          const disabled = disabledIndex.map(entry => vaultById.get(entry.id) ?? entry);
          const payload: BackupPayload = { version: 1, exportedAt: Date.now(), cookies, collections, disabled, audit };
          return payload;
        }
        case 'import': {
          const payload = message.payload as BackupPayload;
          const current = new Set((await listCookies()).map(cookie => cookie.key));
          const conflicts = payload.cookies.filter(cookie => current.has(cookie.key));
          const eligible = payload.cookies.filter(cookie => !current.has(cookie.key));
          if (message.commit) for (const cookie of (message.force ? payload.cookies : eligible)) await chrome.cookies.set(toSetDetails(cookie));
          if (message.commit) {
            for (const entry of payload.disabled) await native({ action: 'vaultPut', id: entry.id, payload: entry });
            const disabledIndex = payload.disabled.map(entry => ({ ...entry, cookie: { ...entry.cookie, value: '' } }));
            await chrome.storage.local.set({ [STORAGE.collections]: payload.collections, [STORAGE.disabled]: disabledIndex, [STORAGE.audit]: payload.audit });
          }
          return { eligible: eligible.length, conflicts: conflicts.map(cookie => cookie.key) };
        }
        case 'nativeStatus': {
          try { return await chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: 'status' }); }
          catch { return { available: false }; }
        }
        default: throw new Error('Unsupported action');
      }
    };
    void run().then(value => sendResponse({ ok: true, value })).catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }));
    return true;
  });
});
