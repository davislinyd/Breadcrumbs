import { describe, expect, it } from 'vitest';
import { cookieKey } from '../src/domain/cookie-model';
import {
  classifyImportCookies,
  mergeAudit,
  mergeCollections,
  mergeDisabledIndex,
  planImportCommit,
} from '../src/domain/import-merge';
import type { AuditEntry, BackupPayload, CookieCollection, CookieRecord, DisabledCookie } from '../src/domain/types';

const make = (name: string): CookieRecord => {
  const cookie: CookieRecord = {
    key: '',
    name,
    value: 'v',
    domain: 'example.com',
    path: '/',
    storeId: '0',
    hostOnly: true,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    session: true,
  };
  cookie.key = cookieKey(cookie);
  return cookie;
};

describe('import merge', () => {
  it('classifies eligible and conflict cookies', () => {
    const current = [make('a')];
    const incoming = [make('a'), make('b')];
    const result = classifyImportCookies(current, incoming);
    expect(result.eligible.map((item) => item.name)).toEqual(['b']);
    expect(result.conflicts).toHaveLength(1);
  });

  it('merges collections by id and label', () => {
    const existing: CookieCollection[] = [{ id: '1', label: 'Work', color: '#000', keys: ['a'] }];
    const incoming: CookieCollection[] = [
      { id: '2', label: 'work', color: '#111', keys: ['b'] },
      { id: '3', label: 'Home', color: '#222', keys: ['c'] },
    ];
    const merged = mergeCollections(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.label.toLocaleLowerCase() === 'work')?.keys.sort()).toEqual(['a', 'b']);
  });

  it('merges audit with cap and id de-dupe', () => {
    const existing: AuditEntry[] = [{ id: '1', at: 1, action: 'delete', key: 'a', summary: 'old' }];
    const incoming: AuditEntry[] = [
      { id: '2', at: 2, action: 'delete', key: 'b', summary: 'new' },
      { id: '1', at: 1, action: 'delete', key: 'a', summary: 'old-dup' },
    ];
    expect(mergeAudit(existing, incoming, 2).map((item) => item.id)).toEqual(['2', '1']);
  });

  it('merges disabled index and redacts values', () => {
    const existing: DisabledCookie[] = [{ id: '1', disabledAt: 1, cookie: { ...make('a'), value: '' } }];
    const incoming: DisabledCookie[] = [{ id: '2', disabledAt: 2, cookie: make('b') }];
    const merged = mergeDisabledIndex(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === '2')?.cookie.value).toBe('');
  });

  it('plans force import to write all cookies', () => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: 1,
      cookies: [make('a'), make('b')],
      collections: [],
      disabled: [],
      audit: [],
    };
    const plan = planImportCommit(payload, [make('a')], true);
    expect(plan.cookiesToWrite).toHaveLength(2);
  });
});
