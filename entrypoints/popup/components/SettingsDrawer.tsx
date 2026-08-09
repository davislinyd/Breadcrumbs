import { X } from 'lucide-react';
import type { AppSettings, CookieCollection } from '../../../src/domain/types';
import { t } from '../i18n/zh-Hant';

type View = AppSettings['defaultView'];

export function SettingsDrawer({
  settings,
  nativeAvailable,
  collections,
  onView,
  onSync,
  onRenameCollection,
  onDeleteCollection,
  onClose,
}: {
  settings: AppSettings;
  nativeAvailable: boolean | null;
  collections: CookieCollection[];
  onView(view: View): void;
  onSync(): void;
  onRenameCollection(id: string): void;
  onDeleteCollection(id: string): void;
  onClose(): void;
}) {
  return (
    <aside className="drawer">
      <div className="drawer-head">
        <strong>{t.settings}</strong>
        <button onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <section>
        <label>
          {t.defaultView}
          <select value={settings.defaultView} onChange={(event) => onView(event.target.value as View)}>
            <option value="Domain">{t.viewDomain}</option>
            <option value="FQDN">{t.viewFqdn}</option>
            <option value="URL">{t.viewUrl}</option>
          </select>
        </label>
        <p>
          <b>{t.hostAccess}</b>
          <span>{t.hostAccessAll}</span>
        </p>
        <p>
          <b>{t.nativeCompanion}</b>
          <span className={nativeAvailable ? 'good' : 'warning'}>
            {nativeAvailable ? t.nativeConnected : t.nativeMissing}
          </span>
        </p>
        <button type="button" className="drawer-action" onClick={onSync}>
          {t.syncNow}
        </button>
      </section>
      <section className="collections-section">
        <strong>{t.collectionsManage}</strong>
        {collections.length === 0 && <p className="muted">{t.noCollections}</p>}
        {collections.map((item) => (
          <div key={item.id} className="collection-row">
            <span>
              {item.label} <small>({item.keys.length})</small>
            </span>
            <div>
              <button type="button" onClick={() => onRenameCollection(item.id)}>
                {t.rename}
              </button>
              <button type="button" className="danger-text" onClick={() => onDeleteCollection(item.id)}>
                {t.deleteCollection}
              </button>
            </div>
          </div>
        ))}
      </section>
    </aside>
  );
}
