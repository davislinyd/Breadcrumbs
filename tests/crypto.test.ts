import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64, decryptBackup, encryptBackup } from '../src/crypto/backup';
import { cookieKey as makeKey } from '../src/domain/cookie-model';
import type { BackupPayload, CookieRecord } from '../src/domain/types';

const cookie = (): CookieRecord => ({
  key: '',
  name: 'SID',
  value: 'secret',
  domain: 'accounts.google.com',
  path: '/',
  storeId: '0',
  hostOnly: true,
  httpOnly: true,
  secure: true,
  sameSite: 'no_restriction',
  session: true,
});

describe('backup encryption', () => {
  it('round-trips an encrypted payload and rejects a wrong password', async () => {
    const item = cookie();
    item.key = makeKey(item);
    const payload: BackupPayload = {
      version: 1,
      exportedAt: 1,
      cookies: [item],
      collections: [],
      disabled: [],
      audit: [],
    };
    const encrypted = await encryptBackup(payload, 'correct horse battery staple');
    await expect(decryptBackup(encrypted, 'wrong password')).rejects.toThrow();
    await expect(decryptBackup(encrypted, 'correct horse battery staple')).resolves.toEqual(payload);
  }, 30_000);

  it('requires at least eight Unicode characters for new backups', async () => {
    const item = cookie();
    item.key = makeKey(item);
    const payload: BackupPayload = {
      version: 1,
      exportedAt: 1,
      cookies: [item],
      collections: [],
      disabled: [],
      audit: [],
    };
    await expect(encryptBackup(payload, '1234567')).rejects.toThrow('at least 8 characters');
    const encrypted = await encryptBackup(payload, '你好世界你好世界');
    await expect(decryptBackup(encrypted, '你好世界你好世界')).resolves.toEqual(payload);
  }, 30_000);

  it('keeps partitioned cookie identities distinct', () => {
    const item = cookie();
    expect(makeKey(item)).not.toEqual(makeKey({ ...item, partitionKey: { topLevelSite: 'https://example.com' } }));
  });

  it('encodes and decodes large binary payloads without stack overflow', () => {
    const bytes = new Uint8Array(200_000);
    for (let offset = 0; offset < bytes.length; offset += 65_536) {
      crypto.getRandomValues(bytes.subarray(offset, Math.min(offset + 65_536, bytes.length)));
    }
    const encoded = bytesToBase64(bytes);
    expect(base64ToBytes(encoded)).toEqual(bytes);
  });
});
