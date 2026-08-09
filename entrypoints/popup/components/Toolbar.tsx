import { Filter, Globe2, Search } from 'lucide-react';
import type { RefObject } from 'react';
import type { AppSettings } from '../../../src/domain/types';
import { t } from '../i18n/zh-Hant';

type View = AppSettings['defaultView'];

export function Toolbar({
  count,
  query,
  onQuery,
  view,
  onView,
  urlTarget,
  onUrlTarget,
  onUrlCommit,
  searchRef,
}: {
  count: number;
  query: string;
  onQuery(value: string): void;
  view: View;
  onView(view: View): void;
  urlTarget: string;
  onUrlTarget(value: string): void;
  onUrlCommit(): void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <section className="toolbar">
      <div className="total">
        <Globe2 size={16} />
        <strong>{t.allCookies}</strong>
        <span>{count}</span>
      </div>
      <label className="search">
        <Search size={15} />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
        />
        <kbd>/</kbd>
      </label>
      <label className="view-select">
        <Filter size={14} />
        <select value={view} onChange={(event) => onView(event.target.value as View)}>
          <option value="Domain">{t.viewDomain}</option>
          <option value="FQDN">{t.viewFqdn}</option>
          <option value="URL">{t.viewUrl}</option>
        </select>
      </label>
      {view === 'URL' && (
        <label className="url-target">
          <Globe2 size={14} />
          <input
            value={urlTarget}
            onChange={(event) => onUrlTarget(event.target.value)}
            onBlur={onUrlCommit}
            placeholder={t.urlPlaceholder}
          />
        </label>
      )}
    </section>
  );
}
