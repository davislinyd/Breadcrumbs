import { describe, expect, it } from 'vitest';
import { cookieKey } from '../src/domain/cookie-model';
import { groupCookies } from '../src/domain/grouping';
import type { CookieRecord } from '../src/domain/types';

const make = (name: string, domain: string, path = '/'): CookieRecord => {
  const cookie: CookieRecord = {
    key: '',
    name,
    value: 'x',
    domain,
    path,
    storeId: '0',
    hostOnly: !domain.startsWith('.'),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    session: true,
  };
  cookie.key = cookieKey(cookie);
  return cookie;
};

describe('groupCookies', () => {
  it('groups by registrable-style domain in Domain view', () => {
    const groups = groupCookies(
      [make('a', '.www.example.com'), make('b', 'shop.example.com'), make('c', '.other.org')],
      { view: 'Domain' },
    );
    expect(groups.map(([label]) => label)).toEqual(['example.com', 'other.org']);
    expect(groups[0][1]).toHaveLength(2);
  });

  it('filters by query in O(n) buckets', () => {
    const many = Array.from({ length: 200 }, (_, index) => make(`c${index}`, `.site${index % 5}.com`));
    const groups = groupCookies(many, { view: 'Domain', query: 'c1' });
    expect(
      groups.every(([, items]) => items.every((cookie) => cookie.name.includes('c1') || cookie.domain.includes('c1'))),
    ).toBe(true);
  });

  it('uses host for URL view when target is valid', () => {
    const groups = groupCookies([make('a', '.example.com')], {
      view: 'URL',
      urlTarget: 'https://example.com/path',
    });
    expect(groups[0][0]).toBe('example.com');
  });
});
