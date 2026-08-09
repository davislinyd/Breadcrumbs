import type { AuditEntry, BackupPayload, CookieCollection, CookieKey, CookieRecord, DisabledCookie } from './types';

export function classifyImportCookies(current: CookieRecord[], incoming: CookieRecord[]) {
  const currentKeys = new Set(current.map((cookie) => cookie.key));
  const conflicts = incoming.filter((cookie) => currentKeys.has(cookie.key));
  const eligible = incoming.filter((cookie) => !currentKeys.has(cookie.key));
  return {
    eligible,
    conflicts: conflicts.map((cookie) => cookie.key) as CookieKey[],
    conflictCookies: conflicts,
  };
}

export function mergeCollections(existing: CookieCollection[], incoming: CookieCollection[]): CookieCollection[] {
  const byId = new Map(existing.map((item) => [item.id, { ...item, keys: [...item.keys] }]));
  const labelIndex = new Map(existing.map((item) => [item.label.toLocaleLowerCase(), item.id]));

  for (const next of incoming) {
    const labelKey = next.label.toLocaleLowerCase();
    const mappedId = byId.has(next.id) ? next.id : labelIndex.get(labelKey);
    if (mappedId && byId.has(mappedId)) {
      const current = byId.get(mappedId)!;
      current.keys = [...new Set([...current.keys, ...next.keys])];
      if (!byId.has(next.id) && next.label) current.label = next.label;
      continue;
    }
    byId.set(next.id, { ...next, keys: [...next.keys] });
    labelIndex.set(labelKey, next.id);
  }

  return [...byId.values()];
}

export function mergeAudit(existing: AuditEntry[], incoming: AuditEntry[], limit = 200): AuditEntry[] {
  const seen = new Set<string>();
  const merged: AuditEntry[] = [];
  for (const entry of [...incoming, ...existing]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    merged.push(entry);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function mergeDisabledIndex(existing: DisabledCookie[], incoming: DisabledCookie[]): DisabledCookie[] {
  const byId = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of incoming) {
    byId.set(entry.id, {
      ...entry,
      cookie: { ...entry.cookie, value: '' },
    });
  }
  return [...byId.values()];
}

export function planImportCommit(payload: BackupPayload, currentCookies: CookieRecord[], force: boolean) {
  const classified = classifyImportCookies(currentCookies, payload.cookies);
  const cookiesToWrite = force ? payload.cookies : classified.eligible;
  return {
    ...classified,
    cookiesToWrite,
  };
}
