import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup } from '../src/crypto';
import { cookieKey, type BackupPayload, type CookieRecord } from '../src/types';

const cookie = (): CookieRecord => ({
  key: '', name: 'SID', value: 'secret', domain: 'accounts.google.com', path: '/', storeId: '0', hostOnly: true,
  httpOnly: true, secure: true, sameSite: 'no_restriction', session: true,
});

describe('backup encryption', () => {
  it('round-trips an encrypted payload and rejects a wrong password', async () => {
    const item = cookie(); item.key = cookieKey(item);
    const payload: BackupPayload = { version: 1, exportedAt: 1, cookies: [item], collections: [], disabled: [], audit: [] };
    const encrypted = await encryptBackup(payload, 'correct horse battery staple');
    await expect(decryptBackup(encrypted, 'wrong password')).rejects.toThrow();
    await expect(decryptBackup(encrypted, 'correct horse battery staple')).resolves.toEqual(payload);
  }, 30_000);

  it('keeps partitioned cookie identities distinct', () => {
    const item = cookie();
    expect(cookieKey(item)).not.toEqual(cookieKey({ ...item, partitionKey: { topLevelSite: 'https://example.com' } }));
  });
});
