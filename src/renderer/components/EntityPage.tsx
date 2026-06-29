import { useMemo, useState } from 'react';
import { ArrowUpDown, Check, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import type { FieldDefinition } from './EntityModal';
import { EntityModal } from './EntityModal';

export interface ColumnDefinition {
  key: string;
  label: string;
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}

interface EntityPageProps {
  title: string;
  description: string;
  singular: string;
  records: Record<string, unknown>[];
  fields: FieldDefinition[];
  columns: ColumnDefinition[];
  emptyTitle: string;
  emptyBody: string;
  defaultValue: Record<string, unknown>;
  summary?: React.ReactNode;
  filters?: { key: string; label: string; options: string[] }[];
  primaryAction?: { label: string; when: (record: Record<string, unknown>) => boolean; run: (record: Record<string, unknown>) => void };
  onCreate: (value: Record<string, unknown>) => void;
  onUpdate: (id: string, value: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

export function EntityPage(props: EntityPageProps) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(props.columns[0]?.key ?? 'id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return props.records
      .filter((record) => !normalizedQuery || Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery)))
      .filter((record) => Object.entries(activeFilters).every(([key, value]) => !value || String(record[key]) === value))
      .sort((a, b) => {
        const left = a[sortKey];
        const right = b[sortKey];
        const result = typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left ?? '').localeCompare(String(right ?? ''));
        return sortDirection === 'asc' ? result : -result;
      });
  }, [activeFilters, props.records, query, sortDirection, sortKey]);

  const sort = (key: string) => {
    if (sortKey === key) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <h1>{props.title}</h1>
          <p>{props.description}</p>
        </div>
        <button className="button primary" onClick={() => setCreating(true)}><Plus size={17} /> Add {props.singular}</button>
      </div>

      {props.summary}

      <section className="data-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={16} />
            <input aria-label={`Search ${props.title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${props.title.toLowerCase()}`} />
          </label>
          <div className="filters">
            {props.filters?.map((filter) => (
              <label key={filter.key}>
                <span className="sr-only">{filter.label}</span>
                <select value={activeFilters[filter.key] ?? ''} onChange={(event) => setActiveFilters((current) => ({ ...current, [filter.key]: event.target.value }))}>
                  <option value="">All {filter.label}</option>
                  {filter.options.map((option) => <option value={option} key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>

        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {props.columns.map((column) => (
                    <th key={column.key}>
                      <button onClick={() => sort(column.key)}>{column.label}<ArrowUpDown size={12} /></button>
                    </th>
                  ))}
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((record) => (
                  <tr key={String(record.id)}>
                    {props.columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(record[column.key], record) : String(record[column.key] ?? 'Not set')}</td>
                    ))}
                    <td className="row-actions">
                      {props.primaryAction?.when(record) && (
                        <button className="row-action primary-action" onClick={() => props.primaryAction?.run(record)}>
                          <Check size={14} /> {props.primaryAction.label}
                        </button>
                      )}
                      <button className="icon-button" aria-label={`Edit ${String(record.name ?? record.title ?? record.itemName)}`} onClick={() => setEditing(record)}><Edit3 size={15} /></button>
                      <button className="icon-button danger" aria-label={`Delete ${String(record.name ?? record.title ?? record.itemName)}`} onClick={() => {
                        if (window.confirm(`Delete this ${props.singular.toLowerCase()}? This cannot be undone.`)) props.onDelete(String(record.id));
                      }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-mark"><Plus size={24} /></div>
            <h2>{query || Object.values(activeFilters).some(Boolean) ? 'No matching items' : props.emptyTitle}</h2>
            <p>{query || Object.values(activeFilters).some(Boolean) ? 'Clear the search or filters to see other records.' : props.emptyBody}</p>
            {!query && !Object.values(activeFilters).some(Boolean) && (
              <button className="button secondary" onClick={() => setCreating(true)}>Add your first {props.singular.toLowerCase()}</button>
            )}
          </div>
        )}
      </section>

      {creating && (
        <EntityModal
          title={`Add ${props.singular}`}
          fields={props.fields}
          initialValue={props.defaultValue}
          onClose={() => setCreating(false)}
          onSave={(value) => { props.onCreate(value); setCreating(false); }}
        />
      )}
      {editing && (
        <EntityModal
          title={`Edit ${props.singular}`}
          fields={props.fields}
          initialValue={editing}
          onClose={() => setEditing(null)}
          onSave={(value) => { props.onUpdate(String(editing.id), value); setEditing(null); }}
        />
      )}
    </div>
  );
}
