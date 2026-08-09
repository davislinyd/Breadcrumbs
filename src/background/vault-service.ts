import type { CookieRecord, DisabledCookie, DisableResult, RestoreResult } from '../domain/types';
import { appendAudit, uid } from './audit-service';
import { getCookie, removeCookie, setCookie } from './cookies-service';
import { AppFailure } from './errors';
import { nativeMessage } from './native';
import { getStored, STORAGE, setStored } from './storage';

function redactEntry(entry: DisabledCookie): DisabledCookie {
  return { ...entry, cookie: { ...entry.cookie, value: '' } };
}

async function vaultPut(entry: DisabledCookie) {
  const result = await nativeMessage<{ stored?: boolean; ok?: boolean }>({
    action: 'vaultPut',
    id: entry.id,
    payload: entry,
  });
  if (result.stored === false) throw new AppFailure('vault', 'Unable to encrypt the isolation vault entry');
}

async function vaultGet(id: string): Promise<DisabledCookie | undefined> {
  const response = await nativeMessage<{ entry?: DisabledCookie | null }>({ action: 'vaultGet', id });
  return response.entry ?? undefined;
}

async function vaultDelete(id: string) {
  await nativeMessage({ action: 'vaultDelete', id });
}

export async function vaultList(): Promise<DisabledCookie[]> {
  const response = await nativeMessage<{ entries?: DisabledCookie[] }>({ action: 'vaultList' });
  return response.entries ?? [];
}

export async function disableCookies(cookies: CookieRecord[], dueAt?: number): Promise<DisableResult> {
  const disabled = await getStored<DisabledCookie[]>(STORAGE.disabled, []);
  const succeeded: DisabledCookie[] = [];
  const failed: DisableResult['failed'] = [];

  for (const cookie of cookies) {
    const entry: DisabledCookie = { id: uid(), cookie, dueAt, disabledAt: Date.now() };
    try {
      await vaultPut(entry);
      try {
        await removeCookie(cookie);
      } catch (error) {
        await vaultDelete(entry.id).catch(() => undefined);
        throw error;
      }
      succeeded.push(entry);
      if (dueAt) await chrome.alarms.create(`restore:${entry.id}`, { when: dueAt });
      await appendAudit({
        id: uid(),
        at: Date.now(),
        action: 'disable',
        key: cookie.key,
        summary: `暫時停用 ${cookie.name}`,
        undo: entry,
      });
    } catch (error) {
      failed.push({
        key: cookie.key,
        error:
          error instanceof AppFailure
            ? error.toJSON()
            : { code: 'disable', message: error instanceof Error ? error.message : 'Disable failed' },
      });
    }
  }

  if (succeeded.length) {
    const index = [...disabled, ...succeeded.map(redactEntry)];
    await setStored({ [STORAGE.disabled]: index });
  }

  return { succeeded, failed };
}

export async function restoreCookies(ids: string[], force = false): Promise<RestoreResult> {
  const disabled = await getStored<DisabledCookie[]>(STORAGE.disabled, []);
  const requested = disabled.filter((entry) => ids.includes(entry.id));
  const pending = disabled.filter((entry) => !ids.includes(entry.id));
  const conflicts: DisabledCookie[] = [];
  let restored = 0;

  for (const index of requested) {
    const entry = await vaultGet(index.id);
    if (!entry) throw new AppFailure('vault', 'Encrypted isolation entry is unavailable');
    const existing = await getCookie(entry.cookie);
    if (existing && !force) {
      conflicts.push(redactEntry(entry));
      continue;
    }
    await setCookie(entry.cookie);
    await chrome.alarms.clear(`restore:${entry.id}`);
    await vaultDelete(entry.id);
    await appendAudit({
      id: uid(),
      at: Date.now(),
      action: 'restore',
      key: entry.cookie.key,
      summary: `已還原 ${entry.cookie.name}`,
    });
    restored += 1;
  }

  await setStored({ [STORAGE.disabled]: [...pending, ...conflicts] });
  return { restored, conflicts };
}

export async function refreshDueRestores() {
  const disabled = await getStored<DisabledCookie[]>(STORAGE.disabled, []);
  const due = disabled.filter((entry) => entry.dueAt && entry.dueAt <= Date.now()).map((entry) => entry.id);
  if (due.length) await restoreCookies(due);
  for (const entry of disabled.filter((entry) => entry.dueAt && entry.dueAt > Date.now())) {
    const alarm = await chrome.alarms.get(`restore:${entry.id}`);
    if (!alarm) await chrome.alarms.create(`restore:${entry.id}`, { when: entry.dueAt! });
  }
}
