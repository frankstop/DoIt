import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Archive, ArrowRight, BellRing, CalendarDays, Check, CircleDollarSign,
  Clock3, CreditCard, Download, FileArchive, FileText, FolderOpen, Home, Menu, Moon,
  Package, Plus, Receipt, RefreshCw, Search, Settings, Sun, Upload, WalletCards, X
} from 'lucide-react';
import type {
  AppData, Appointment, Bill, DocumentRecord, ItemType, Purchase, Subscription, Task
} from '../shared/models';
import { EMPTY_DATA } from '../shared/models';
import { EntityPage, type ColumnDefinition } from './components/EntityPage';
import type { FieldDefinition } from './components/EntityModal';
import {
  annualizedSubscriptionTotal, billsDueThisMonth, computeAttentionQueue, daysUntil,
  globalSearch, isOverdue, isWithin, money, monthlyRecurringTotal, shortDate,
  subscriptionMonthlyTotal, weeklySummary
} from './lib/logic';

type Section = 'home' | 'bills' | 'subscriptions' | 'documents' | 'purchases' | 'appointments' | 'tasks' | 'settings';
type CollectionKey = 'bills' | 'subscriptions' | 'documents' | 'purchases' | 'appointments' | 'tasks';

const nowDate = () => new Date().toISOString().slice(0, 10);
const nowDateTime = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 16);

const billFields: FieldDefinition[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'provider', label: 'Provider', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'dueDate', label: 'Due date', type: 'date', required: true },
  { key: 'recurrence', label: 'Recurrence', type: 'select', options: ['one-time', 'weekly', 'monthly', 'yearly'] },
  { key: 'autopay', label: 'Autopay enabled', type: 'checkbox' },
  { key: 'category', label: 'Category', type: 'select', options: ['rent', 'utilities', 'insurance', 'phone', 'internet', 'loan', 'credit card', 'other'] },
  { key: 'status', label: 'Status', type: 'select', options: ['upcoming', 'paid', 'overdue'] },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

const subscriptionFields: FieldDefinition[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'provider', label: 'Provider', required: true },
  { key: 'monthlyCost', label: 'Monthly cost', type: 'number', required: true },
  { key: 'billingCycle', label: 'Billing cycle', type: 'select', options: ['monthly', 'yearly', 'trial', 'other'] },
  { key: 'nextRenewalDate', label: 'Next renewal date', type: 'date', required: true },
  { key: 'cancellationDeadline', label: 'Cancellation deadline', type: 'date' },
  { key: 'category', label: 'Category', type: 'select', options: ['streaming', 'software', 'phone', 'fitness', 'finance', 'storage', 'other'] },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'trial', 'cancel soon', 'canceled'] },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

const documentFields: FieldDefinition[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'type', label: 'Type', type: 'select', options: ['license', 'passport', 'insurance', 'lease', 'tax', 'warranty', 'medical', 'school', 'work', 'other'] },
  { key: 'location', label: 'Stored at', placeholder: 'Wallet, filing cabinet, Google Drive…' },
  { key: 'expirationDate', label: 'Expiration date', type: 'date' },
  { key: 'renewalReminderDate', label: 'Renewal reminder', type: 'date' },
  { key: 'provider', label: 'Provider or agency' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'renewalNotes', label: 'Renewal notes', type: 'textarea' }
];

const purchaseFields: FieldDefinition[] = [
  { key: 'itemName', label: 'Item name', required: true },
  { key: 'store', label: 'Store', required: true },
  { key: 'purchaseDate', label: 'Purchase date', type: 'date', required: true },
  { key: 'price', label: 'Price', type: 'number', required: true },
  { key: 'returnDeadline', label: 'Return deadline', type: 'date' },
  { key: 'warrantyExpiration', label: 'Warranty expiration', type: 'date' },
  { key: 'receiptLocation', label: 'Receipt location' },
  { key: 'serialNumber', label: 'Serial number' },
  { key: 'category', label: 'Category', type: 'select', options: ['electronics', 'appliance', 'furniture', 'clothing', 'tool', 'other'] },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

const appointmentFields: FieldDefinition[] = [
  { key: 'title', label: 'Title', required: true },
  { key: 'dateTime', label: 'Date and time', type: 'datetime-local', required: true },
  { key: 'location', label: 'Location' },
  { key: 'category', label: 'Category', type: 'select', options: ['doctor', 'dentist', 'car', 'home', 'work', 'school', 'government', 'other'] },
  { key: 'preparationNotes', label: 'Preparation notes', type: 'textarea' },
  { key: 'followUpNeeded', label: 'Create a task when completed', type: 'checkbox' },
  { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'completed', 'canceled'] }
];

const taskFields: FieldDefinition[] = [
  { key: 'title', label: 'Title', required: true },
  { key: 'dueDate', label: 'Due date', type: 'date', required: true },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
  { key: 'status', label: 'Status', type: 'select', options: ['open', 'done'] },
  { key: 'linkedItemType', label: 'Linked item type', type: 'select', options: ['bill', 'subscription', 'document', 'warranty', 'appointment', 'none'] },
  { key: 'linkedItemId', label: 'Linked item ID' },
  { key: 'notes', label: 'Notes', type: 'textarea' }
];

const defaults: Record<CollectionKey, Record<string, unknown>> = {
  bills: { name: '', provider: '', amount: 0, dueDate: nowDate(), recurrence: 'monthly', autopay: false, category: 'other', status: 'upcoming', notes: '' },
  subscriptions: { name: '', provider: '', monthlyCost: 0, billingCycle: 'monthly', nextRenewalDate: nowDate(), cancellationDeadline: '', category: 'other', status: 'active', notes: '' },
  documents: { name: '', type: 'other', location: '', expirationDate: '', renewalReminderDate: '', provider: '', notes: '', renewalNotes: '' },
  purchases: { itemName: '', store: '', purchaseDate: nowDate(), price: 0, returnDeadline: '', warrantyExpiration: '', receiptLocation: '', serialNumber: '', category: 'other', notes: '' },
  appointments: { title: '', dateTime: nowDateTime(), location: '', category: 'other', preparationNotes: '', followUpNeeded: false, status: 'scheduled' },
  tasks: { title: '', dueDate: nowDate(), priority: 'medium', status: 'open', linkedItemType: 'none', linkedItemId: '', notes: '' }
};

const navItems: { id: Section; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'purchases', label: 'Purchases', icon: Package },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: Check }
];

function asRecords<T>(values: T[]): Record<string, unknown>[] {
  return values as unknown as Record<string, unknown>[];
}

function StatusBadge({ value }: { value: unknown }) {
  const text = String(value);
  return <span className={`badge status-${text.replaceAll(' ', '-')}`}>{text}</span>;
}

function DateCell({ value }: { value: unknown }) {
  const text = String(value ?? '');
  return <span className={isOverdue(text) ? 'overdue-text' : ''}>{shortDate(text)}</span>;
}

function SummaryStrip({ children }: { children: React.ReactNode }) {
  return <div className="summary-strip">{children}</div>;
}

function SummaryMetric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="summary-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

export default function App() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [section, setSection] = useState<Section>('home');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [toast, setToast] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loadedRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.electronAPI.loadData()
      .then((loaded) => {
        setData(loaded);
        document.documentElement.dataset.theme = loaded.settings.theme;
        loadedRef.current = true;
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Could not load local data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      window.electronAPI.saveData(data).then((result) => {
        setSaveStatus(result.success ? 'saved' : 'error');
        if (!result.success) notify(result.message ?? 'Changes could not be saved.');
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const create = (key: CollectionKey, value: Record<string, unknown>) => {
    const stamp = new Date().toISOString();
    setData((current) => ({
      ...current,
      [key]: [...current[key], { ...value, id: crypto.randomUUID(), createdAt: stamp, updatedAt: stamp }]
    }));
    notify('Item added.');
  };

  const update = (key: CollectionKey, id: string, value: Record<string, unknown>) => {
    setData((current) => ({
      ...current,
      [key]: current[key].map((item) => item.id === id ? { ...item, ...value, id, updatedAt: new Date().toISOString() } : item)
    }));
    notify('Changes saved.');
  };

  const remove = (key: CollectionKey, id: string) => {
    setData((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
    notify('Item deleted.');
  };

  const markAppointmentCompleted = (appointment: Appointment) => {
    const stamp = new Date().toISOString();
    setData((current) => {
      const alreadyLinked = current.tasks.some((task) => task.linkedItemType === 'appointment' && task.linkedItemId === appointment.id);
      const followUp: Task = {
        id: crypto.randomUUID(),
        title: `Follow up: ${appointment.title}`,
        dueDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        priority: 'medium',
        status: 'open',
        linkedItemType: 'appointment',
        linkedItemId: appointment.id,
        notes: `Created after completing ${appointment.title}.`,
        createdAt: stamp,
        updatedAt: stamp
      };
      return {
        ...current,
        appointments: current.appointments.map((item) => item.id === appointment.id ? { ...item, status: 'completed', updatedAt: stamp } : item),
        tasks: appointment.followUpNeeded && !alreadyLinked ? [...current.tasks, followUp] : current.tasks
      };
    });
    notify(appointment.followUpNeeded ? 'Appointment completed and follow-up task created.' : 'Appointment completed.');
  };

  const runAttentionAction = (item: ReturnType<typeof computeAttentionQueue>[number]) => {
    if (item.quickAction === 'mark-paid') {
      update('bills', item.sourceId, { status: 'paid' });
      return;
    }
    if (item.quickAction === 'cancel') {
      update('subscriptions', item.sourceId, { status: 'canceled' });
      return;
    }
    if (item.quickAction === 'complete') {
      if (item.type === 'task') update('tasks', item.sourceId, { status: 'done' });
      if (item.type === 'appointment') {
        const appointment = data.appointments.find((entry) => entry.id === item.sourceId);
        if (appointment) markAppointmentCompleted(appointment);
      }
      return;
    }
    const route: Record<ItemType, Section> = {
      bill: 'bills', subscription: 'subscriptions', document: 'documents',
      purchase: 'purchases', appointment: 'appointments', task: 'tasks'
    };
    setSection(route[item.type]);
  };

  const showFileResult = (result: { success: boolean; canceled?: boolean; path?: string; message?: string }, successMessage: string) => {
    if (result.canceled) return;
    notify(result.success ? `${successMessage}${result.path ? ` ${result.path}` : ''}` : result.message ?? 'The file action failed.');
  };

  const importData = async () => {
    if (!window.confirm('Importing will replace all current data. Continue?')) return;
    const result = await window.electronAPI.importJson();
    if (result.success && result.data) {
      setData(result.data);
      document.documentElement.dataset.theme = result.data.settings.theme;
    }
    showFileResult(result, 'Imported from');
  };

  const toggleTheme = () => {
    const theme = data.settings.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    setData((current) => ({ ...current, settings: { ...current.settings, theme } }));
  };

  const searchResults = useMemo(() => globalSearch(data, searchQuery), [data, searchQuery]);
  const attention = useMemo(() => computeAttentionQueue(data), [data]);

  if (loading) return <div className="startup"><div className="startup-mark">DO IT.</div><p>Loading your command center…</p></div>;
  if (loadError) return (
    <div className="startup error-screen"><AlertTriangle size={32} /><h1>Local data could not be loaded</h1><p>{loadError}</p><button className="button primary" onClick={() => location.reload()}>Try again</button></div>
  );

  const navigate = (next: Section) => {
    setSection(next);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">DO IT.</div>
        <nav aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><Icon size={18} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-tools">
          <button onClick={importData}><Upload size={17} />Import</button>
          <button onClick={async () => showFileResult(await window.electronAPI.exportJson(data), 'Exported to')}><Download size={17} />Export JSON</button>
          <button onClick={async () => showFileResult(await window.electronAPI.exportWeeklySummary(weeklySummary(data)), 'Summary exported to')}><FileText size={17} />Weekly summary</button>
          <button onClick={async () => showFileResult(await window.electronAPI.createBackup(data), 'Backup created at')}><FileArchive size={17} />Backup</button>
          <button className={section === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Settings size={17} />Settings</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setSidebarOpen((current) => !current)} aria-label="Toggle navigation"><Menu size={20} /></button>
          <div className="section-title">{navItems.find((item) => item.id === section)?.label ?? 'Settings'}</div>
          <button className="global-search-trigger" onClick={() => { setSearchOpen(true); window.setTimeout(() => searchRef.current?.focus(), 0); }}>
            <Search size={16} /><span>Search everything</span><kbd>⌘ K</kbd>
          </button>
          <button className="icon-button" aria-label={`Use ${data.settings.theme === 'light' ? 'dark' : 'light'} mode`} onClick={toggleTheme}>
            {data.settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>

        <div className="content">
          {section === 'home' && <Dashboard data={data} attention={attention} onNavigate={navigate} onAction={runAttentionAction} />}
          {section === 'bills' && <BillsPage data={data} create={create} update={update} remove={remove} />}
          {section === 'subscriptions' && <SubscriptionsPage data={data} create={create} update={update} remove={remove} />}
          {section === 'documents' && <DocumentsPage data={data} create={create} update={update} remove={remove} />}
          {section === 'purchases' && <PurchasesPage data={data} create={create} update={update} remove={remove} />}
          {section === 'appointments' && <AppointmentsPage data={data} create={create} update={update} remove={remove} complete={markAppointmentCompleted} />}
          {section === 'tasks' && <TasksPage data={data} create={create} update={update} remove={remove} />}
          {section === 'settings' && (
            <SettingsPage
              data={data}
              toggleTheme={toggleTheme}
              importData={importData}
              notify={notify}
              showFileResult={showFileResult}
            />
          )}
        </div>

        <footer className="statusbar">
          <span className={`save-indicator ${saveStatus}`} />
          <span>{saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'error' ? 'Save failed' : 'All changes saved locally'}</span>
          <button onClick={async () => showFileResult(await window.electronAPI.openDataFolder(), 'Opened')}>Open data folder <FolderOpen size={13} /></button>
        </footer>
      </main>

      {searchOpen && (
        <div className="search-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}>
          <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Global search">
            <div className="search-input-row">
              <Search size={20} />
              <input ref={searchRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search bills, documents, tasks, and more" />
              <button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={18} /></button>
            </div>
            <div className="search-results">
              {!searchQuery ? <div className="search-prompt"><kbd>⌘ K</kbd><p>Type a name, provider, note, status, or category.</p></div>
                : searchResults.length ? searchResults.map((result) => (
                  <button key={`${result.type}-${result.id}`} onClick={() => {
                    const route = result.type === 'bill' ? 'bills' : result.type === 'subscription' ? 'subscriptions' : result.type === 'document' ? 'documents' : result.type === 'purchase' ? 'purchases' : result.type === 'appointment' ? 'appointments' : 'tasks';
                    navigate(route);
                    setSearchOpen(false);
                  }}>
                    <span className={`type-mark type-${result.type}`}>{result.type.slice(0, 1).toUpperCase()}</span>
                    <span><strong>{result.title}</strong><small>{result.context}</small></span>
                    <time>{shortDate(result.date)}</time><ArrowRight size={15} />
                  </button>
                )) : <div className="search-prompt"><Search size={24} /><p>No results for “{searchQuery}”.</p></div>}
            </div>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Dashboard({ data, attention, onNavigate, onAction }: {
  data: AppData;
  attention: ReturnType<typeof computeAttentionQueue>;
  onNavigate: (section: Section) => void;
  onAction: (item: ReturnType<typeof computeAttentionQueue>[number]) => void;
}) {
  const dueMonth = billsDueThisMonth(data.bills);
  const upcomingAppointments = data.appointments
    .filter((item) => item.status === 'scheduled' && daysUntil(item.dateTime) >= 0)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .slice(0, 5);
  const metrics = [
    { label: 'Due this month', value: money(dueMonth.reduce((sum, item) => sum + item.amount, 0)), note: `${dueMonth.length} bills`, icon: CreditCard, color: 'blue', route: 'bills' as Section },
    { label: 'Monthly recurring', value: money(monthlyRecurringTotal(data)), note: `${data.subscriptions.filter((item) => item.status !== 'canceled').length} subscriptions`, icon: RefreshCw, color: 'green', route: 'subscriptions' as Section },
    { label: 'Open tasks', value: String(data.tasks.filter((item) => item.status === 'open').length), note: `${data.tasks.filter((item) => item.status === 'open' && isWithin(item.dueDate, 7)).length} due soon`, icon: BellRing, color: 'orange', route: 'tasks' as Section },
    { label: 'Overdue', value: String(attention.filter((item) => item.urgency === 'critical').length), note: 'Needs action', icon: AlertTriangle, color: 'red', route: 'home' as Section }
  ];
  const hasData = Object.entries(data).some(([key, value]) => Array.isArray(value) && value.length > 0);

  return (
    <div className="dashboard page">
      <div className="page-intro dashboard-intro">
        <div><h1>Today</h1><p>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p></div>
        <button className="button primary" onClick={() => onNavigate('tasks')}><Plus size={17} /> Add task</button>
      </div>

      {!hasData && (
        <section className="welcome-panel">
          <div>
            <span className="welcome-index">01</span>
            <h2>Put the important dates in one place.</h2>
            <p>Your command center starts empty and stays on this computer. Add the next bill, renewal, appointment, or follow-up you cannot afford to miss.</p>
          </div>
          <div className="welcome-actions">
            <button onClick={() => onNavigate('bills')}>Add a bill <ArrowRight size={16} /></button>
            <button onClick={() => onNavigate('subscriptions')}>Track a subscription <ArrowRight size={16} /></button>
            <button onClick={() => onNavigate('documents')}>Add a document <ArrowRight size={16} /></button>
          </div>
        </section>
      )}

      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button className={`metric-card ${metric.color}`} key={metric.label} onClick={() => onNavigate(metric.route)}>
              <Icon size={22} /><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small><ArrowRight className="metric-arrow" size={16} />
            </button>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="attention-panel">
          <header><div><h2>Needs attention</h2><p>Deadlines and follow-ups across your records.</p></div><span className="count">{attention.length}</span></header>
          {attention.length ? (
            <div className="attention-table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Type</th><th>Reason</th><th>Due</th><th>Urgency</th><th>Action</th></tr></thead>
                <tbody>
                  {attention.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong></td>
                      <td><span className={`type-label type-${item.type}`}>{item.type}</span></td>
                      <td>{item.reason}</td>
                      <td><DateCell value={item.dueDate} /></td>
                      <td><span className={`urgency ${item.urgency}`}>{item.urgency}</span></td>
                      <td><button className="table-link" onClick={() => onAction(item)}>{item.quickAction === 'mark-paid' ? 'Mark paid' : item.quickAction === 'cancel' ? 'Cancel' : item.quickAction === 'complete' ? 'Complete' : 'Open'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="compact-empty"><Check size={23} /><div><h3>Nothing needs attention</h3><p>New deadlines will appear here automatically.</p></div></div>}
        </section>

        <aside className="dashboard-rail">
          <section className="rail-panel">
            <header><h2>Upcoming</h2><button onClick={() => onNavigate('appointments')}>View all</button></header>
            {upcomingAppointments.length ? upcomingAppointments.map((item) => (
              <button className="appointment-row" key={item.id} onClick={() => onNavigate('appointments')}>
                <time><strong>{new Date(item.dateTime).getDate()}</strong><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(item.dateTime))}</span></time>
                <span><strong>{item.title}</strong><small>{item.location || 'No location'} · {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(item.dateTime))}</small></span>
              </button>
            )) : <div className="rail-empty"><CalendarDays size={20} /><p>No upcoming appointments.</p></div>}
          </section>
          <section className="rail-panel recurring-panel">
            <header><h2>Recurring costs</h2><button onClick={() => onNavigate('subscriptions')}>View all</button></header>
            <div className="big-number">{money(subscriptionMonthlyTotal(data.subscriptions))}<span>/ month</span></div>
            <div className="annual-row"><span>Annualized</span><strong>{money(annualizedSubscriptionTotal(data.subscriptions))}</strong></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BillsPage({ data, create, update, remove }: CrudProps) {
  const columns: ColumnDefinition[] = [
    { key: 'name', label: 'Bill', render: (value, row) => <div className="primary-cell"><strong>{String(value)}</strong><small>{String(row.provider)}</small></div> },
    { key: 'amount', label: 'Amount', render: (value) => money(Number(value)) },
    { key: 'dueDate', label: 'Due date', render: (value) => <DateCell value={value} /> },
    { key: 'recurrence', label: 'Recurrence' },
    { key: 'autopay', label: 'Autopay', render: (value) => value ? 'Yes' : 'No' },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge value={value} /> }
  ];
  const due = data.bills.filter((item) => item.status !== 'paid');
  return <EntityPage title="Bills" description="Stay ahead of due dates and know what leaves your account." singular="Bill" records={asRecords(data.bills)} fields={billFields} columns={columns}
    defaultValue={defaults.bills} emptyTitle="No bills tracked" emptyBody="Add a bill to calculate monthly totals and upcoming deadlines."
    filters={[{ key: 'status', label: 'statuses', options: ['upcoming', 'paid', 'overdue'] }, { key: 'category', label: 'categories', options: ['rent', 'utilities', 'insurance', 'phone', 'internet', 'loan', 'credit card', 'other'] }]}
    summary={<SummaryStrip><SummaryMetric label="Due this month" value={money(billsDueThisMonth(data.bills).reduce((sum, item) => sum + item.amount, 0))} /><SummaryMetric label="Next 7 days" value={String(due.filter((item) => isWithin(item.dueDate, 7)).length)} /><SummaryMetric label="Next 14 days" value={String(due.filter((item) => isWithin(item.dueDate, 14)).length)} /><SummaryMetric label="Next 30 days" value={String(due.filter((item) => isWithin(item.dueDate, 30)).length)} /></SummaryStrip>}
    primaryAction={{ label: 'Paid', when: (record) => record.status !== 'paid', run: (record) => update('bills', String(record.id), { status: 'paid' }) }}
    onCreate={(value) => create('bills', value)} onUpdate={(id, value) => update('bills', id, value)} onDelete={(id) => remove('bills', id)} />;
}

function SubscriptionsPage({ data, create, update, remove }: CrudProps) {
  const columns: ColumnDefinition[] = [
    { key: 'name', label: 'Subscription', render: (value, row) => <div className="primary-cell"><strong>{String(value)}</strong><small>{String(row.provider)}</small></div> },
    { key: 'monthlyCost', label: 'Monthly', render: (value) => money(Number(value)) },
    { key: 'nextRenewalDate', label: 'Renews', render: (value) => <DateCell value={value} /> },
    { key: 'cancellationDeadline', label: 'Cancel by', render: (value) => <DateCell value={value} /> },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge value={value} /> }
  ];
  return <EntityPage title="Subscriptions" description="See every recurring charge and stop unwanted renewals in time." singular="Subscription" records={asRecords(data.subscriptions)} fields={subscriptionFields} columns={columns}
    defaultValue={defaults.subscriptions} emptyTitle="No subscriptions tracked" emptyBody="Add recurring services and trials to see their true monthly and annual cost."
    filters={[{ key: 'status', label: 'statuses', options: ['active', 'trial', 'cancel soon', 'canceled'] }, { key: 'category', label: 'categories', options: ['streaming', 'software', 'phone', 'fitness', 'finance', 'storage', 'other'] }]}
    summary={<SummaryStrip><SummaryMetric label="Monthly total" value={money(subscriptionMonthlyTotal(data.subscriptions))} /><SummaryMetric label="Annualized total" value={money(annualizedSubscriptionTotal(data.subscriptions))} /><SummaryMetric label="Renewing in 14 days" value={String(data.subscriptions.filter((item) => item.status !== 'canceled' && isWithin(item.nextRenewalDate, 14)).length)} /><SummaryMetric label="Trials ending soon" value={String(data.subscriptions.filter((item) => item.status === 'trial' && isWithin(item.cancellationDeadline, 7)).length)} /></SummaryStrip>}
    primaryAction={{ label: 'Cancel', when: (record) => record.status !== 'canceled', run: (record) => update('subscriptions', String(record.id), { status: 'canceled' }) }}
    onCreate={(value) => create('subscriptions', value)} onUpdate={(id, value) => update('subscriptions', id, value)} onDelete={(id) => remove('subscriptions', id)} />;
}

function DocumentsPage({ data, create, update, remove }: CrudProps) {
  const columns: ColumnDefinition[] = [
    { key: 'name', label: 'Document', render: (value, row) => <div className="primary-cell"><strong>{String(value)}</strong><small>{String(row.provider || 'No provider')}</small></div> },
    { key: 'type', label: 'Type' },
    { key: 'location', label: 'Location', render: (value) => value ? String(value) : <span className="warning-text">Missing</span> },
    { key: 'expirationDate', label: 'Expires', render: (value) => <DateCell value={value} /> },
    { key: 'renewalReminderDate', label: 'Reminder', render: (value) => <DateCell value={value} /> }
  ];
  return <EntityPage title="Documents" description="Track where important records live and when they need renewal." singular="Document" records={asRecords(data.documents)} fields={documentFields} columns={columns}
    defaultValue={defaults.documents} emptyTitle="No documents tracked" emptyBody="Add a document record without uploading the document itself."
    filters={[{ key: 'type', label: 'types', options: ['license', 'passport', 'insurance', 'lease', 'tax', 'warranty', 'medical', 'school', 'work', 'other'] }]}
    summary={<SummaryStrip><SummaryMetric label="Tracked" value={String(data.documents.length)} /><SummaryMetric label="Expiring in 30 days" value={String(data.documents.filter((item) => isWithin(item.expirationDate, 30)).length)} /><SummaryMetric label="Missing location" value={String(data.documents.filter((item) => !item.location.trim()).length)} /></SummaryStrip>}
    primaryAction={{ label: 'Renewed', when: (record) => Boolean(record.expirationDate), run: (record) => update('documents', String(record.id), { expirationDate: '', renewalReminderDate: '', renewalNotes: `Renewed ${new Date().toLocaleDateString()}. ${String(record.renewalNotes ?? '')}`.trim() }) }}
    onCreate={(value) => create('documents', value)} onUpdate={(id, value) => update('documents', id, value)} onDelete={(id) => remove('documents', id)} />;
}

function PurchasesPage({ data, create, update, remove }: CrudProps) {
  const columns: ColumnDefinition[] = [
    { key: 'itemName', label: 'Item', render: (value, row) => <div className="primary-cell"><strong>{String(value)}</strong><small>{String(row.store)}</small></div> },
    { key: 'price', label: 'Price', render: (value) => money(Number(value)) },
    { key: 'purchaseDate', label: 'Purchased', render: (value) => <DateCell value={value} /> },
    { key: 'returnDeadline', label: 'Return by', render: (value) => <DateCell value={value} /> },
    { key: 'warrantyExpiration', label: 'Warranty ends', render: (value) => <DateCell value={value} /> },
    { key: 'receiptLocation', label: 'Receipt', render: (value) => value ? String(value) : <span className="warning-text">Missing</span> }
  ];
  return <EntityPage title="Purchases" description="Keep receipts, return windows, and warranty dates easy to find." singular="Purchase" records={asRecords(data.purchases)} fields={purchaseFields} columns={columns}
    defaultValue={defaults.purchases} emptyTitle="No purchases tracked" emptyBody="Add higher-value purchases so return and warranty dates do not slip by."
    filters={[{ key: 'category', label: 'categories', options: ['electronics', 'appliance', 'furniture', 'clothing', 'tool', 'other'] }]}
    summary={<SummaryStrip><SummaryMetric label="Tracked value" value={money(data.purchases.reduce((sum, item) => sum + item.price, 0))} /><SummaryMetric label="Return windows ending" value={String(data.purchases.filter((item) => isWithin(item.returnDeadline, 7)).length)} /><SummaryMetric label="Warranties ending" value={String(data.purchases.filter((item) => isWithin(item.warrantyExpiration, 30)).length)} /><SummaryMetric label="Missing receipts" value={String(data.purchases.filter((item) => !item.receiptLocation.trim()).length)} /></SummaryStrip>}
    onCreate={(value) => create('purchases', value)} onUpdate={(id, value) => update('purchases', id, value)} onDelete={(id) => remove('purchases', id)} />;
}

function AppointmentsPage({ data, create, update, remove, complete }: CrudProps & { complete: (item: Appointment) => void }) {
  const columns: ColumnDefinition[] = [
    { key: 'title', label: 'Appointment', render: (value, row) => <div className="primary-cell"><strong>{String(value)}</strong><small>{String(row.location || 'No location')}</small></div> },
    { key: 'dateTime', label: 'Date and time', render: (value) => <DateCell value={value} /> },
    { key: 'category', label: 'Category' },
    { key: 'followUpNeeded', label: 'Follow-up', render: (value) => value ? 'Needed' : 'No' },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge value={value} /> }
  ];
  const scheduled = data.appointments.filter((item) => item.status === 'scheduled');
  return <EntityPage title="Appointments" description="Keep the date, location, preparation, and next action together." singular="Appointment" records={asRecords(data.appointments)} fields={appointmentFields} columns={columns}
    defaultValue={defaults.appointments} emptyTitle="No appointments scheduled" emptyBody="Add the next appointment and anything you need to prepare."
    filters={[{ key: 'status', label: 'statuses', options: ['scheduled', 'completed', 'canceled'] }, { key: 'category', label: 'categories', options: ['doctor', 'dentist', 'car', 'home', 'work', 'school', 'government', 'other'] }]}
    summary={<SummaryStrip><SummaryMetric label="Today" value={String(scheduled.filter((item) => daysUntil(item.dateTime) === 0).length)} /><SummaryMetric label="This week" value={String(scheduled.filter((item) => isWithin(item.dateTime, 7)).length)} /><SummaryMetric label="Follow-up required" value={String(scheduled.filter((item) => item.followUpNeeded).length)} /></SummaryStrip>}
    primaryAction={{ label: 'Complete', when: (record) => record.status === 'scheduled', run: (record) => { const item = data.appointments.find((entry) => entry.id === record.id); if (item) complete(item); } }}
    onCreate={(value) => create('appointments', value)} onUpdate={(id, value) => update('appointments', id, value)} onDelete={(id) => remove('appointments', id)} />;
}

function TasksPage({ data, create, update, remove }: CrudProps) {
  const columns: ColumnDefinition[] = [
    { key: 'title', label: 'Task', render: (value, row) => <div className="primary-cell"><strong>{String(value)}</strong><small>{row.linkedItemType === 'none' ? 'Unlinked' : `Linked to ${String(row.linkedItemType)}`}</small></div> },
    { key: 'dueDate', label: 'Due date', render: (value) => <DateCell value={value} /> },
    { key: 'priority', label: 'Priority', render: (value) => <span className={`urgency ${value === 'high' ? 'high' : value === 'medium' ? 'medium' : 'low'}`}>{String(value)}</span> },
    { key: 'linkedItemType', label: 'Linked item' },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge value={value} /> }
  ];
  const open = data.tasks.filter((item) => item.status === 'open');
  return <EntityPage title="Tasks" description="Capture the follow-ups that do not belong on a generic to-do list." singular="Task" records={asRecords(data.tasks)} fields={taskFields} columns={columns}
    defaultValue={defaults.tasks} emptyTitle="No follow-up tasks" emptyBody="Add a task or let a completed appointment create one for you."
    filters={[{ key: 'status', label: 'statuses', options: ['open', 'done'] }, { key: 'priority', label: 'priorities', options: ['low', 'medium', 'high'] }]}
    summary={<SummaryStrip><SummaryMetric label="Open" value={String(open.length)} /><SummaryMetric label="Due today" value={String(open.filter((item) => daysUntil(item.dueDate) === 0).length)} /><SummaryMetric label="Overdue" value={String(open.filter((item) => isOverdue(item.dueDate)).length)} /><SummaryMetric label="High priority" value={String(open.filter((item) => item.priority === 'high').length)} /></SummaryStrip>}
    primaryAction={{ label: 'Done', when: (record) => record.status === 'open', run: (record) => update('tasks', String(record.id), { status: 'done' }) }}
    onCreate={(value) => create('tasks', value)} onUpdate={(id, value) => update('tasks', id, value)} onDelete={(id) => remove('tasks', id)} />;
}

interface CrudProps {
  data: AppData;
  create: (key: CollectionKey, value: Record<string, unknown>) => void;
  update: (key: CollectionKey, id: string, value: Record<string, unknown>) => void;
  remove: (key: CollectionKey, id: string) => void;
}

function SettingsPage({ data, toggleTheme, importData, notify, showFileResult }: {
  data: AppData;
  toggleTheme: () => void;
  importData: () => void;
  notify: (message: string) => void;
  showFileResult: (result: { success: boolean; canceled?: boolean; path?: string; message?: string }, message: string) => void;
}) {
  return (
    <div className="page settings-page">
      <div className="page-intro"><div><h1>Settings</h1><p>Manage appearance, local files, and portable copies of your data.</p></div></div>
      <section className="settings-section">
        <div><h2>Appearance</h2><p>Switch between light and dark desktop themes.</p></div>
        <button className="button secondary" onClick={toggleTheme}>{data.settings.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />} Use {data.settings.theme === 'light' ? 'dark' : 'light'} mode</button>
      </section>
      <section className="settings-section">
        <div><h2>Data portability</h2><p>Exports and backups use your Downloads folder by default. You choose the final filename.</p></div>
        <div className="settings-actions">
          <button className="button secondary" onClick={importData}><Upload size={17} /> Import JSON</button>
          <button className="button secondary" onClick={async () => showFileResult(await window.electronAPI.exportJson(data), 'Exported to')}><Download size={17} /> Export JSON</button>
          <button className="button secondary" onClick={async () => showFileResult(await window.electronAPI.exportWeeklySummary(weeklySummary(data)), 'Summary exported to')}><FileText size={17} /> Weekly summary</button>
          <button className="button secondary" onClick={async () => showFileResult(await window.electronAPI.createBackup(data), 'Backup created at')}><Archive size={17} /> Create backup</button>
        </div>
      </section>
      <section className="settings-section">
        <div><h2>Local storage</h2><p>DO IT. stores one JSON database inside Electron’s private application-data directory.</p></div>
        <button className="button secondary" onClick={async () => {
          const result = await window.electronAPI.openDataFolder();
          if (result.success) notify('Data folder opened.');
          else notify(result.message ?? 'Could not open the data folder.');
        }}><FolderOpen size={17} /> Open data folder</button>
      </section>
      <section className="privacy-callout"><WalletCards size={21} /><div><h2>Your data stays on this computer</h2><p>No account, cloud sync, telemetry, or network service is used.</p></div></section>
    </div>
  );
}
