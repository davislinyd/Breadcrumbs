import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Eye,
  Globe2,
  PauseCircle,
  Square,
  Trash2,
} from 'lucide-react';
import { memo } from 'react';
import { rawCookie } from '../../../src/domain/cookie-model';
import type { CookieRecord } from '../../../src/domain/types';
import { t } from '../i18n/zh-Hant';

const fmtExpiry = (cookie: CookieRecord) =>
  cookie.session
    ? t.session
    : cookie.expirationDate
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(cookie.expirationDate * 1000)
      : t.session;

const rowTitle = (cookie: CookieRecord) => {
  const host = cookie.domain.replace(/^\./, '');
  const scope = cookie.hostOnly ? t.hostOnly : t.domainScope;
  return `${cookie.name} · ${host} · ${cookie.path} · ${scope}`;
};

export const DomainGroup = memo(function DomainGroup({
  domain,
  items,
  expanded,
  checked,
  selected,
  onToggle,
  onCheck,
  onSelect,
  onCopy,
  onDisable,
  onDelete,
}: {
  domain: string;
  items: CookieRecord[];
  expanded: boolean;
  checked: boolean;
  selected?: string;
  onToggle(): void;
  onCheck(): void;
  onSelect(cookie: CookieRecord): void;
  onCopy(value: string): void;
  onDisable(cookie: CookieRecord): void;
  onDelete(cookie: CookieRecord): void;
}) {
  return (
    <div className="domain-group">
      <div className="domain-row">
        <button className="check" aria-label={t.selectSite(domain)} onClick={onCheck}>
          {checked ? <CheckSquare size={15} /> : <Square size={15} />}
        </button>
        <button className="domain-toggle" onClick={onToggle}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <Globe2 size={15} />
          <strong>{domain}</strong>
          <span>{items.length}</span>
        </button>
      </div>
      {expanded && (
        <div className="rows">
          <div className="column-head">
            <span>{t.columnName}</span>
            <span>{t.columnScope}</span>
            <span>{t.columnPath}</span>
            <span>{t.columnFlags}</span>
            <span>{t.columnExpiry}</span>
            <span>{t.columnActions}</span>
          </div>
          {items.map((cookie) => (
            <div
              className={`cookie-row ${selected === cookie.key ? 'selected' : ''}`}
              key={cookie.key}
              title={rowTitle(cookie)}
              onClick={() => onSelect(cookie)}
            >
              <strong>{cookie.name}</strong>
              <span className={cookie.hostOnly ? 'scope host' : 'scope'}>
                {cookie.hostOnly ? t.hostOnly : t.domainScope}
              </span>
              <span>{cookie.path}</span>
              <span className="flags">
                {cookie.secure && (
                  <span className="flag-chip" title="Secure">
                    S
                  </span>
                )}
                {cookie.httpOnly && (
                  <span className="flag-chip" title="HttpOnly">
                    H
                  </span>
                )}
              </span>
              <span className={cookie.session ? 'expiry session' : 'expiry'}>
                <i />
                {fmtExpiry(cookie)}
              </span>
              <span className="actions">
                <button
                  title={t.reveal}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(cookie);
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  title={t.copyNameValue}
                  onClick={(event) => {
                    event.stopPropagation();
                    void onCopy(rawCookie(cookie));
                  }}
                >
                  <Clipboard size={14} />
                </button>
                <button
                  title={t.disableTitle}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDisable(cookie);
                  }}
                >
                  <PauseCircle size={14} />
                </button>
                <button
                  title={t.delete}
                  className="danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(cookie);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
