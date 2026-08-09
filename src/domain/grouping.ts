import { groupDomain } from './cookie-model';
import type { AppSettings, CookieRecord } from './types';

export type ViewMode = AppSettings['defaultView'];

export type CookieGroup = [label: string, cookies: CookieRecord[]];

export function groupCookies(
  cookies: CookieRecord[],
  options: { view: ViewMode; query?: string; urlTarget?: string },
): CookieGroup[] {
  const target = options.query?.trim().toLowerCase() ?? '';
  let targetHost = '';
  if (options.view === 'URL' && options.urlTarget) {
    try {
      targetHost = new URL(options.urlTarget).host;
    } catch {
      targetHost = options.urlTarget;
    }
  }

  const map = new Map<string, CookieRecord[]>();
  for (const cookie of cookies) {
    if (target && ![cookie.name, cookie.domain, cookie.path].some((value) => value.toLowerCase().includes(target))) {
      continue;
    }
    const label =
      options.view === 'FQDN'
        ? cookie.domain.replace(/^\./, '')
        : options.view === 'URL'
          ? targetHost || `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path}`
          : groupDomain(cookie.domain);
    const bucket = map.get(label);
    if (bucket) bucket.push(cookie);
    else map.set(label, [cookie]);
  }

  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
