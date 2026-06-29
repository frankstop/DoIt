import type {
  AppData,
  Appointment,
  AttentionItem,
  Bill,
  DocumentRecord,
  ItemType,
  Purchase,
  Subscription,
  Task
} from '../../shared/models';

const DAY = 86_400_000;

export function startOfDay(value: string | Date = new Date()): Date {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}${value.includes('T') ? '' : 'T00:00:00'}`);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysUntil(value: string, now = new Date()): number {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.ceil((startOfDay(value).getTime() - startOfDay(now).getTime()) / DAY);
}

export function isOverdue(value: string): boolean {
  return Boolean(value) && daysUntil(value) < 0;
}

export function isWithin(value: string, days: number): boolean {
  const delta = daysUntil(value);
  return delta >= 0 && delta <= days;
}

export function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
}

export function shortDate(value: string): string {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function monthlyRecurringTotal(data: AppData): number {
  const bills = data.bills
    .filter((item) => item.status !== 'paid')
    .reduce((sum, item) => {
      if (item.recurrence === 'weekly') return sum + item.amount * 4.345;
      if (item.recurrence === 'yearly') return sum + item.amount / 12;
      if (item.recurrence === 'monthly') return sum + item.amount;
      return sum;
    }, 0);
  return bills + subscriptionMonthlyTotal(data.subscriptions);
}

export function subscriptionMonthlyTotal(items: Subscription[]): number {
  return items.filter((item) => item.status !== 'canceled').reduce((sum, item) => sum + item.monthlyCost, 0);
}

export function annualizedSubscriptionTotal(items: Subscription[]): number {
  return subscriptionMonthlyTotal(items) * 12;
}

export function billsDueThisMonth(items: Bill[]): Bill[] {
  const now = new Date();
  return items.filter((item) => {
    const date = new Date(item.dueDate);
    return item.status !== 'paid' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

function attention(
  type: ItemType,
  sourceId: string,
  title: string,
  urgency: AttentionItem['urgency'],
  reason: string,
  dueDate: string,
  quickAction?: AttentionItem['quickAction']
): AttentionItem {
  return { id: `${type}-${sourceId}-${reason}`, type, sourceId, title, urgency, reason, dueDate, quickAction };
}

export function computeAttentionQueue(data: AppData): AttentionItem[] {
  const items: AttentionItem[] = [];

  data.bills.filter((item) => item.status !== 'paid').forEach((item) => {
    if (isOverdue(item.dueDate) || item.status === 'overdue') {
      items.push(attention('bill', item.id, item.name, 'critical', 'Bill is overdue', item.dueDate, 'mark-paid'));
    } else if (isWithin(item.dueDate, 7)) {
      items.push(attention('bill', item.id, item.name, 'high', 'Bill is due within 7 days', item.dueDate, 'mark-paid'));
    }
  });

  data.subscriptions.filter((item) => item.status !== 'canceled').forEach((item) => {
    if (isWithin(item.nextRenewalDate, 14)) {
      items.push(attention('subscription', item.id, item.name, 'medium', 'Renews within 14 days', item.nextRenewalDate, 'open'));
    }
    if (item.status === 'trial' && isWithin(item.cancellationDeadline, 7)) {
      items.push(attention('subscription', item.id, item.name, 'high', 'Trial cancellation deadline is close', item.cancellationDeadline, 'cancel'));
    }
  });

  data.documents.forEach((item) => {
    if (isWithin(item.expirationDate, 30)) {
      items.push(attention('document', item.id, item.name, 'medium', 'Document expires within 30 days', item.expirationDate, 'open'));
    }
    if (!item.location.trim()) {
      items.push(attention('document', item.id, item.name, 'low', 'Storage location is missing', '', 'open'));
    }
  });

  data.purchases.forEach((item) => {
    if (isWithin(item.returnDeadline, 7)) {
      items.push(attention('purchase', item.id, item.itemName, 'high', 'Return window closes within 7 days', item.returnDeadline, 'open'));
    }
    if (isWithin(item.warrantyExpiration, 30)) {
      items.push(attention('purchase', item.id, item.itemName, 'medium', 'Warranty expires within 30 days', item.warrantyExpiration, 'open'));
    }
    if (!item.receiptLocation.trim()) {
      items.push(attention('purchase', item.id, item.itemName, 'low', 'Receipt location is missing', '', 'open'));
    }
  });

  data.tasks.filter((item) => item.status === 'open' && isOverdue(item.dueDate)).forEach((item) => {
    items.push(attention('task', item.id, item.title, item.priority === 'high' ? 'critical' : 'high', 'Task is overdue', item.dueDate, 'complete'));
  });

  data.appointments.filter((item) => item.status === 'scheduled' && isWithin(item.dateTime, 1)).forEach((item) => {
    items.push(attention('appointment', item.id, item.title, daysUntil(item.dateTime) === 0 ? 'high' : 'medium', 'Appointment is today or tomorrow', item.dateTime, 'complete'));
  });

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => rank[a.urgency] - rank[b.urgency] || daysUntil(a.dueDate) - daysUntil(b.dueDate));
}

export interface SearchResult {
  id: string;
  type: ItemType;
  title: string;
  context: string;
  date: string;
}

function includesQuery(values: unknown[], query: string): boolean {
  return values.some((value) => String(value ?? '').toLowerCase().includes(query));
}

export function globalSearch(data: AppData, input: string): SearchResult[] {
  const query = input.trim().toLowerCase();
  if (!query) return [];
  const results: SearchResult[] = [];
  data.bills.forEach((item) => {
    if (includesQuery([item.name, item.provider, item.category, item.status, item.notes], query)) {
      results.push({ id: item.id, type: 'bill', title: item.name, context: `${item.provider} · ${money(item.amount)}`, date: item.dueDate });
    }
  });
  data.subscriptions.forEach((item) => {
    if (includesQuery([item.name, item.provider, item.category, item.status, item.notes], query)) {
      results.push({ id: item.id, type: 'subscription', title: item.name, context: `${item.provider} · ${money(item.monthlyCost)}/month`, date: item.nextRenewalDate });
    }
  });
  data.documents.forEach((item) => {
    if (includesQuery([item.name, item.type, item.provider, item.location, item.notes, item.renewalNotes], query)) {
      results.push({ id: item.id, type: 'document', title: item.name, context: `${item.type} · ${item.location || 'Location missing'}`, date: item.expirationDate });
    }
  });
  data.purchases.forEach((item) => {
    if (includesQuery([item.itemName, item.store, item.category, item.serialNumber, item.notes], query)) {
      results.push({ id: item.id, type: 'purchase', title: item.itemName, context: `${item.store} · ${money(item.price)}`, date: item.warrantyExpiration || item.returnDeadline });
    }
  });
  data.appointments.forEach((item) => {
    if (includesQuery([item.title, item.location, item.category, item.preparationNotes, item.status], query)) {
      results.push({ id: item.id, type: 'appointment', title: item.title, context: `${item.category} · ${item.location}`, date: item.dateTime });
    }
  });
  data.tasks.forEach((item) => {
    if (includesQuery([item.title, item.priority, item.status, item.linkedItemType, item.notes], query)) {
      results.push({ id: item.id, type: 'task', title: item.title, context: `${item.priority} priority · ${item.status}`, date: item.dueDate });
    }
  });
  return results.slice(0, 30);
}

function listLine(title: string, date: string, extra = ''): string {
  return `- ${title}${date ? ` | ${shortDate(date)}` : ''}${extra ? ` (${extra})` : ''}`;
}

export function weeklySummary(data: AppData): string {
  const bills = data.bills.filter((item) => item.status !== 'paid' && isWithin(item.dueDate, 7));
  const renewals = data.subscriptions.filter((item) => item.status !== 'canceled' && isWithin(item.nextRenewalDate, 7));
  const documents = data.documents.filter((item) => isWithin(item.expirationDate, 30));
  const appointments = data.appointments.filter((item) => item.status === 'scheduled' && isWithin(item.dateTime, 7));
  const tasks = data.tasks.filter((item) => item.status === 'open' && item.priority === 'high');
  const section = <T,>(title: string, values: T[], render: (item: T) => string) =>
    `## ${title}\n\n${values.length ? values.map(render).join('\n') : '- None'}\n`;

  return [
    '# DO IT. Weekly Summary',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    section('Bills due this week', bills, (item) => listLine(item.name, item.dueDate, money(item.amount))),
    section('Renewals coming up', renewals, (item) => listLine(item.name, item.nextRenewalDate, money(item.monthlyCost))),
    section('Expiring documents', documents, (item) => listLine(item.name, item.expirationDate, item.type)),
    section('Upcoming appointments', appointments, (item) => listLine(item.title, item.dateTime, item.location)),
    section('Open high-priority tasks', tasks, (item) => listLine(item.title, item.dueDate)),
    `## Monthly subscription total\n\n${money(subscriptionMonthlyTotal(data.subscriptions))}`,
    ''
  ].join('\n');
}

export type AnyRecord = Bill | Subscription | DocumentRecord | Purchase | Appointment | Task;
