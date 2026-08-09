import { Trash2 } from 'lucide-react';
import { t } from '../i18n/zh-Hant';

export function BulkBar({
  siteCount,
  cookieCount,
  onClear,
  onDelete,
}: {
  siteCount: number;
  cookieCount: number;
  onClear(): void;
  onDelete(): void;
}) {
  return (
    <section className="bulkbar">
      <strong>{t.sitesSelected(siteCount, cookieCount)}</strong>
      <button onClick={onClear}>{t.clear}</button>
      <button className="delete-selected" onClick={onDelete}>
        <Trash2 size={14} />
        {t.deleteSelected}
      </button>
    </section>
  );
}
