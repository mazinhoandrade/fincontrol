export type TransactionType = 'income' | 'expense';

export type AccountType = 'dinheiro' | 'banco' | 'carteira' | 'investimento' | 'outros';

export interface Category {
  id: string;
  name: string;
  type: TransactionType | 'both';
  icon: string; // lucide icon identifier
  color: string; // hex or tailwind color
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  institution?: string;
  color: string;
  icon?: string;
  accountNumber?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  billId?: string; // If created from a bill payment
}

export type BillStatus = 'pending' | 'paid' | 'overdue';

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId: string;
  status: BillStatus;
  accountId?: string; // Default or paid with account
  recipient?: string;
  barcode?: string;
  notes?: string;
  paidAt?: string;
  isRecurring?: boolean;
  recurrencePeriod?: 'monthly' | 'weekly' | 'yearly';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'overdue' | 'due_today' | 'due_soon' | 'info';
  read: boolean;
  billId?: string;
}

export type ActiveTab = 'dashboard' | 'transactions' | 'bills' | 'accounts' | 'categories';
