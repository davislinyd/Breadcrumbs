import type { CookieKey, CookieRecord } from './types';

export const cookieKey = (
  cookie: Pick<CookieRecord, 'storeId' | 'name' | 'domain' | 'path' | 'partitionKey'>,
): CookieKey =>
  [cookie.storeId, cookie.name, cookie.domain, cookie.path, JSON.stringify(cookie.partitionKey ?? null)].join('\u001f');

export const toRecord = (cookie: chrome.cookies.Cookie): CookieRecord => {
  const record: CookieRecord = {
    key: '',
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    storeId: cookie.storeId,
    hostOnly: cookie.hostOnly,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    session: cookie.session,
    expirationDate: cookie.expirationDate,
    partitionKey: cookie.partitionKey,
  };
  record.key = cookieKey(record);
  return record;
};

export const cookieUrl = (cookie: Pick<CookieRecord, 'domain' | 'path' | 'secure'>) =>
  `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path || '/'}`;

export const rawCookie = (cookie: CookieRecord) => `${cookie.name}=${cookie.value}`;

export const setCookieText = (cookie: CookieRecord) =>
  [
    rawCookie(cookie),
    `Path=${cookie.path}`,
    !cookie.hostOnly && `Domain=${cookie.domain}`,
    cookie.expirationDate && `Expires=${new Date(cookie.expirationDate * 1000).toUTCString()}`,
    cookie.secure && 'Secure',
    cookie.httpOnly && 'HttpOnly',
    cookie.sameSite !== 'unspecified' &&
      `SameSite=${cookie.sameSite === 'no_restriction' ? 'None' : cookie.sameSite[0].toUpperCase() + cookie.sameSite.slice(1)}`,
  ]
    .filter(Boolean)
    .join('; ');

export const groupDomain = (domain: string) => domain.replace(/^\./, '').split('.').slice(-2).join('.');

export const toSetDetails = (cookie: CookieRecord): chrome.cookies.SetDetails => ({
  url: cookieUrl(cookie),
  name: cookie.name,
  value: cookie.value,
  domain: cookie.hostOnly ? undefined : cookie.domain,
  path: cookie.path,
  secure: cookie.secure,
  httpOnly: cookie.httpOnly,
  sameSite: cookie.sameSite,
  expirationDate: cookie.session ? undefined : cookie.expirationDate,
  storeId: cookie.storeId,
  partitionKey: cookie.partitionKey,
});
