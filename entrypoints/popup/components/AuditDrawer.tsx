import { X } from 'lucide-react';
import type { AuditEntry } from '../../../src/domain/types';
import { t } from '../i18n/zh-Hant';

export function AuditDrawer({ entries, onClose }: { entries: AuditEntry[]; onClose(): void }) {
  return (
    <aside className="drawer audit-drawer">
      <div className="drawer-head">
        <strong>{t.auditLog}</strong>
        <button onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <section className="audit-list">
        {entries.length ? (
          entries.map((entry) => (
            <div key={entry.id}>
              <strong>{entry.summary}</strong>
              <span>{new Date(entry.at).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <p>{t.noAudit}</p>
        )}
      </section>
    </aside>
  );
}
