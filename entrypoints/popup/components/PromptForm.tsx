import { useState } from 'react';
import { t } from '../i18n/zh-Hant';
import { Modal } from './Modal';

type Field =
  | { kind: 'text'; label: string; placeholder?: string; defaultValue?: string }
  | { kind: 'number'; label: string; placeholder?: string; defaultValue?: string }
  | { kind: 'password'; label: string; minLength?: number }
  | { kind: 'datetime'; label: string; defaultValue?: string };

export function PromptForm({
  title,
  field,
  submitLabel,
  onClose,
  onSubmit,
  validate,
}: {
  title: string;
  field: Field;
  submitLabel: string;
  onClose(): void;
  onSubmit(value: string): void;
  validate?(value: string): string | null;
}) {
  const [value, setValue] = useState(field.kind === 'password' ? '' : (field.defaultValue ?? ''));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    const message = validate?.(value) ?? null;
    if (message) {
      setError(message);
      return;
    }
    onSubmit(value);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <label className="form-field">
        <span>{field.label}</span>
        {field.kind === 'password' ? (
          <div className="password-row">
            <input
              autoFocus
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? t.hidePassword : t.showPassword}
            </button>
          </div>
        ) : (
          <input
            autoFocus
            type={field.kind === 'datetime' ? 'datetime-local' : field.kind === 'number' ? 'number' : 'text'}
            value={value}
            placeholder={field.kind === 'text' || field.kind === 'number' ? field.placeholder : undefined}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
        )}
      </label>
      {error && <p className="form-error">{error}</p>}
      <footer>
        <button type="button" onClick={onClose}>
          {t.cancel}
        </button>
        <button type="button" className="primary-button" onClick={submit}>
          {submitLabel}
        </button>
      </footer>
    </Modal>
  );
}
