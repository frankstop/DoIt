import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

export interface FieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface EntityModalProps {
  title: string;
  fields: FieldDefinition[];
  initialValue: Record<string, unknown>;
  onClose: () => void;
  onSave: (value: Record<string, unknown>) => void;
}

export function EntityModal({ title, fields, initialValue, onClose, onSave }: EntityModalProps) {
  const [value, setValue] = useState<Record<string, unknown>>(initialValue);
  const [error, setError] = useState('');
  const formId = useMemo(() => `form-${crypto.randomUUID()}`, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const missing = fields.find((field) => field.required && !String(value[field.key] ?? '').trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    onSave(value);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby={`${formId}-title`}>
        <header className="modal-header">
          <div>
            <p className="utility-label">DO IT.</p>
            <h2 id={`${formId}-title`}>{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <form id={formId} onSubmit={submit}>
          <div className="form-grid">
            {fields.map((field) => {
              const id = `${formId}-${field.key}`;
              const inputValue = value[field.key];
              if (field.type === 'checkbox') {
                return (
                  <label className="checkbox-field" key={field.key} htmlFor={id}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={Boolean(inputValue)}
                      onChange={(event) => setValue((current) => ({ ...current, [field.key]: event.target.checked }))}
                    />
                    <span>{field.label}</span>
                  </label>
                );
              }
              return (
                <label className={field.type === 'textarea' ? 'field span-2' : 'field'} key={field.key} htmlFor={id}>
                  <span>{field.label}{field.required ? ' *' : ''}</span>
                  {field.type === 'select' ? (
                    <select
                      id={id}
                      value={String(inputValue ?? '')}
                      required={field.required}
                      onChange={(event) => setValue((current) => ({ ...current, [field.key]: event.target.value }))}
                    >
                      {field.options?.map((option) => <option value={option} key={option}>{option}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={id}
                      rows={4}
                      value={String(inputValue ?? '')}
                      placeholder={field.placeholder}
                      onChange={(event) => setValue((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <input
                      id={id}
                      type={field.type ?? 'text'}
                      value={String(inputValue ?? '')}
                      placeholder={field.placeholder}
                      step={field.type === 'number' ? '0.01' : undefined}
                      required={field.required}
                      onChange={(event) => setValue((current) => ({
                        ...current,
                        [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value
                      }))}
                    />
                  )}
                </label>
              );
            })}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal-footer">
            <button className="button secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button primary" type="submit">Save</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
