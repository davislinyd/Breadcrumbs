import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/zh-Hant';

export function DeleteConfirm({
  title,
  body,
  expected,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  expected: string;
  onClose(): void;
  onConfirm(): void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div>
          <Trash2 size={23} />
          <h2>{title}</h2>
        </div>
        <p>{body}</p>
        <label>
          {t.typeToConfirm} <code>{expected}</code>
          <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <footer>
          <button onClick={onClose}>{t.cancel}</button>
          <button className="danger-button" disabled={value !== expected} onClick={onConfirm}>
            {t.delete}
          </button>
        </footer>
      </section>
    </div>
  );
}
