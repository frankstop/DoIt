export type Recurrence = 'one-time' | 'weekly' | 'monthly' | 'yearly';
export type BillStatus = 'upcoming' | 'paid' | 'overdue';
export type SubscriptionStatus = 'active' | 'trial' | 'cancel soon' | 'canceled';
export type AppointmentStatus = 'scheduled' | 'completed' | 'canceled';
export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'done';
export type Theme = 'light' | 'dark';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill extends BaseRecord {
  name: string;
  provider: string;
  amount: number;
  dueDate: string;
  recurrence: Recurrence;
  autopay: boolean;
  category: 'rent' | 'utilities' | 'insurance' | 'phone' | 'internet' | 'loan' | 'credit card' | 'other';
  status: BillStatus;
  notes: string;
}

export interface Subscription extends BaseRecord {
  name: string;
  provider: string;
  monthlyCost: number;
  billingCycle: 'monthly' | 'yearly' | 'trial' | 'other';
  nextRenewalDate: string;
  cancellationDeadline: string;
  category: 'streaming' | 'software' | 'phone' | 'fitness' | 'finance' | 'storage' | 'other';
  status: SubscriptionStatus;
  notes: string;
}

export interface DocumentRecord extends BaseRecord {
  name: string;
  type: 'license' | 'passport' | 'insurance' | 'lease' | 'tax' | 'warranty' | 'medical' | 'school' | 'work' | 'other';
  location: string;
  expirationDate: string;
  renewalReminderDate: string;
  provider: string;
  notes: string;
  renewalNotes: string;
}

export interface Purchase extends BaseRecord {
  itemName: string;
  store: string;
  purchaseDate: string;
  price: number;
  returnDeadline: string;
  warrantyExpiration: string;
  receiptLocation: string;
  serialNumber: string;
  category: 'electronics' | 'appliance' | 'furniture' | 'clothing' | 'tool' | 'other';
  notes: string;
}

export interface Appointment extends BaseRecord {
  title: string;
  dateTime: string;
  location: string;
  category: 'doctor' | 'dentist' | 'car' | 'home' | 'work' | 'school' | 'government' | 'other';
  preparationNotes: string;
  followUpNeeded: boolean;
  status: AppointmentStatus;
}

export interface Task extends BaseRecord {
  title: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  linkedItemType: 'bill' | 'subscription' | 'document' | 'warranty' | 'appointment' | 'none';
  linkedItemId: string;
  notes: string;
}

export type ItemType = 'bill' | 'subscription' | 'document' | 'purchase' | 'appointment' | 'task';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface AttentionItem {
  id: string;
  sourceId: string;
  type: ItemType;
  title: string;
  urgency: Urgency;
  reason: string;
  dueDate: string;
  quickAction?: 'mark-paid' | 'cancel' | 'complete' | 'open';
}

export interface AppSettings {
  theme: Theme;
}

export interface AppData {
  version: 1;
  bills: Bill[];
  subscriptions: Subscription[];
  documents: DocumentRecord[];
  purchases: Purchase[];
  appointments: Appointment[];
  tasks: Task[];
  settings: AppSettings;
}

export const EMPTY_DATA: AppData = {
  version: 1,
  bills: [],
  subscriptions: [],
  documents: [],
  purchases: [],
  appointments: [],
  tasks: [],
  settings: { theme: 'light' }
};

export interface FileActionResult {
  success: boolean;
  canceled?: boolean;
  path?: string;
  message?: string;
  data?: AppData;
}

export interface ElectronAPI {
  loadData: () => Promise<AppData>;
  saveData: (data: AppData) => Promise<{ success: boolean; message?: string }>;
  exportJson: (data: AppData) => Promise<FileActionResult>;
  importJson: () => Promise<FileActionResult>;
  exportWeeklySummary: (markdown: string) => Promise<FileActionResult>;
  createBackup: (data: AppData) => Promise<FileActionResult>;
  openDataFolder: () => Promise<{ success: boolean; path?: string; message?: string }>;
}
