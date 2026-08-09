import type { CookieRecord } from '../domain/types';
import { nativeOptional } from './native';
import { loadAudit } from './storage';

const DEBOUNCE_MS = 3000;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: CookieRecord[] | null = null;
let lastFingerprint = '';

function fingerprint(cookies: CookieRecord[]) {
  // Includes values so breadcrumbsctl --raw stays correct after value changes.
  return cookies
    .map(
      (cookie) =>
        `${cookie.key}\u0001${cookie.value}\u0001${cookie.expirationDate ?? ''}\u0001${cookie.session ? 1 : 0}`,
    )
    .sort()
    .join('\u0002');
}

async function flushSnapshot(cookies: CookieRecord[]) {
  const mark = fingerprint(cookies);
  if (mark === lastFingerprint) return;
  const audit = await loadAudit();
  const result = await nativeOptional<{ ok?: boolean; stored?: boolean }>({
    action: 'snapshot',
    payload: { cookies, audit },
  });
  if (result) lastFingerprint = mark;
}

export function scheduleSnapshot(cookies: CookieRecord[]) {
  pending = cookies;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const batch = pending;
    pending = null;
    if (batch) void flushSnapshot(batch);
  }, DEBOUNCE_MS);
}

export async function syncSnapshotNow(cookies?: CookieRecord[]) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = cookies ?? pending;
  pending = null;
  if (batch) await flushSnapshot(batch);
}
