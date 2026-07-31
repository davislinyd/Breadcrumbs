import type { CookieRecord } from './types';
import { cookieKey } from './types';

const make = (name: string, domain: string, options: Partial<CookieRecord> = {}): CookieRecord => {
  const cookie: CookieRecord = {
    key: '', name, value: 'redacted-example-token', domain, path: '/', storeId: '0', hostOnly: false,
    httpOnly: true, secure: true, sameSite: 'no_restriction', session: false,
    expirationDate: Math.floor(Date.now() / 1000) + 86400 * 120, ...options,
  };
  cookie.key = cookieKey(cookie);
  return cookie;
};

export const sampleCookies = [
  make('SID', 'accounts.google.com', { hostOnly: true, session: true }),
  make('HSID', '.google.com'), make('SSID', '.google.com'), make('APISID', '.google.com'),
  make('__Host-1PLSID', 'accounts.google.com', { hostOnly: true }), make('CONSENT', '.google.com'),
  make('YSC', '.youtube.com', { session: true }), make('_ga', '.example.com', { httpOnly: false }),
];
