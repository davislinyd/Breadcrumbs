import { cookieUrl, toRecord, toSetDetails } from '../domain/cookie-model';
import type { CookieRecord } from '../domain/types';
import { scheduleSnapshot } from './sync';

export async function listCookies(url?: string): Promise<CookieRecord[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  const lists = await Promise.all(
    stores.map((store) => chrome.cookies.getAll({ storeId: store.id, ...(url ? { url } : {}) })),
  );
  const records = lists.flat().map(toRecord);
  scheduleSnapshot(records);
  return records;
}

export async function removeCookie(cookie: CookieRecord) {
  return chrome.cookies.remove({
    url: cookieUrl(cookie),
    name: cookie.name,
    storeId: cookie.storeId,
    partitionKey: cookie.partitionKey,
  });
}

export async function setCookie(cookie: CookieRecord) {
  return chrome.cookies.set(toSetDetails(cookie));
}

export async function getCookie(
  cookie: Pick<CookieRecord, 'domain' | 'path' | 'secure' | 'name' | 'storeId' | 'partitionKey'>,
) {
  return chrome.cookies.get({
    url: cookieUrl(cookie),
    name: cookie.name,
    storeId: cookie.storeId,
    partitionKey: cookie.partitionKey,
  });
}
