import { Clipboard, Copy, Eye, EyeOff, Plus, X } from 'lucide-react';
import { rawCookie, setCookieText } from '../../../src/domain/cookie-model';
import type { CookieCollection, CookieRecord } from '../../../src/domain/types';
import { t } from '../i18n/zh-Hant';

const masked = (value: string) => '•'.repeat(Math.min(Math.max(value.length, 12), 24));
const fmtExpiry = (cookie: CookieRecord) =>
  cookie.session
    ? t.session
    : cookie.expirationDate
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(cookie.expirationDate * 1000)
      : t.session;

export function Inspector({
  cookie,
  revealed,
  collections,
  onReveal,
  onCopy,
  onClose,
  onExpiry,
  onAddCollection,
  onRemoveFromCollection,
}: {
  cookie: CookieRecord;
  revealed: boolean;
  collections: CookieCollection[];
  onReveal(): void;
  onCopy(value: string): void;
  onClose(): void;
  onExpiry(): void;
  onAddCollection(): void;
  onRemoveFromCollection(id: string): void;
}) {
  return (
    <aside className="inspector">
      <div className="inspector-head">
        <strong>
          {t.inspector}: {cookie.name}
        </strong>
        <button onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="inspector-body">
        <div className="raw">
          <label>{t.setCookie}</label>
          <code>
            {revealed
              ? setCookieText(cookie)
              : `${cookie.name}=${masked(cookie.value)}; Path=${cookie.path}; Domain=${cookie.domain}`}
          </code>
          <button className="reveal" onClick={onReveal}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            {revealed ? t.hide : t.reveal}
          </button>
        </div>
        <dl>
          <dt>{t.name}</dt>
          <dd>{cookie.name}</dd>
          <dt>{t.value}</dt>
          <dd>{revealed ? cookie.value : masked(cookie.value)}</dd>
          <dt>{t.domain}</dt>
          <dd>
            {cookie.domain} {cookie.hostOnly && `(${t.hostOnly})`}
          </dd>
          <dt>{t.path}</dt>
          <dd>{cookie.path}</dd>
          <dt>{t.expires}</dt>
          <dd>
            {fmtExpiry(cookie)}{' '}
            <button className="text-button" onClick={onExpiry}>
              {t.edit}
            </button>
          </dd>
          <dt>Secure</dt>
          <dd>{cookie.secure ? 'Yes' : 'No'}</dd>
          <dt>HttpOnly</dt>
          <dd>{cookie.httpOnly ? 'Yes' : 'No'}</dd>
          <dt>SameSite</dt>
          <dd>{cookie.sameSite}</dd>
          <dt>{t.collections}</dt>
          <dd className="collections-dd">
            {collections.length
              ? collections.map((item) => (
                  <span key={item.id} className="collection-chip">
                    {item.label}
                    <button type="button" onClick={() => onRemoveFromCollection(item.id)}>
                      {t.removeFromCollection}
                    </button>
                  </span>
                ))
              : null}
            <button className="text-button" onClick={onAddCollection}>
              <Plus size={12} /> {t.addCollection}
            </button>
          </dd>
        </dl>
      </div>
      <div className="inspector-actions">
        <button onClick={() => void onCopy(rawCookie(cookie))}>
          <Copy size={14} />
          {t.copyNameValue}
        </button>
        <button onClick={() => void onCopy(setCookieText(cookie))}>
          <Clipboard size={14} />
          {t.copySetCookie}
        </button>
      </div>
    </aside>
  );
}
