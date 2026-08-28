'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  Account,
  ActiveTab,
  Bill,
  Category,
  NotificationItem,
  Transaction,
  TransactionType,
} from '@/lib/types';
import {
  initialAccounts,
  initialBills,
  initialCategories,
  initialTransactions,
} from '@/lib/initialData';
import { getDaysDifference, formatCurrency, formatDate } from '@/lib/utils';

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  categories: Category[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  // Stats
  totalBalance: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  pendingBillsCount: number;
  pendingBillsTotal: number;
  overdueBillsCount: number;
  overdueBillsTotal: number;
  upcomingBillsCount: number;
  upcomingBillsTotal: number;
  // Actions - Transactions
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  editTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  // Actions - Bills
  addBill: (bill: Omit<Bill, 'id' | 'status'>) => Bill;
  editBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  payBill: (billId: string, accountId: string, paidDate?: string) => void;
  unpayBill: (billId: string) => void;
  // Actions - Accounts
  addAccount: (acc: Omit<Account, 'id'>) => Account;
  editAccount: (id: string, acc: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, description?: string) => void;
  // Actions - Categories
  addCategory: (cat: Omit<Category, 'id'>) => Category;
  editCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  // Actions - Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  // Reset
  resetToDemoData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCOUNTS: 'fincontrol_accounts_v1',
  TRANSACTIONS: 'fincontrol_transactions_v1',
  BILLS: 'fincontrol_bills_v1',
  CATEGORIES: 'fincontrol_categories_v1',
  READ_NOTIFS: 'fincontrol_read_notifs_v1',
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

  // Load from localStorage or initialize with seed data
  useEffect(() => {
    try {
      const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const savedBills = localStorage.getItem(STORAGE_KEYS.BILLS);
      const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const savedReadNotifs = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);

      setAccounts(savedAccounts ? JSON.parse(savedAccounts) : initialAccounts);
      setTransactions(savedTransactions ? JSON.parse(savedTransactions) : initialTransactions);
      setBills(savedBills ? JSON.parse(savedBills) : initialBills);
      setCategories(savedCategories ? JSON.parse(savedCategories) : initialCategories);
      setReadNotifIds(savedReadNotifs ? JSON.parse(savedReadNotifs) : []);
    } catch (e) {
      console.error('Error loading localStorage data', e);
      setAccounts(initialAccounts);
      setTransactions(initialTransactions);
      setBills(initialBills);
      setCategories(initialCategories);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }, [bills, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(readNotifIds));
  }, [readNotifIds, isLoaded]);

  // Update bill statuses automatically based on current date
  useEffect(() => {
    if (!isLoaded) return;
    let hasChanges = false;
    const updatedBills = bills.map((bill) => {
      if (bill.status === 'paid') return bill;
      const daysDiff = getDaysDifference(bill.dueDate);
      const newStatus = daysDiff < 0 ? 'overdue' : 'pending';
      if (newStatus !== bill.status) {
        hasChanges = true;
        return { ...bill, status: newStatus as 'overdue' | 'pending' };
      }
      return bill;
    });

    if (hasChanges) {
      setBills(updatedBills);
    }
  }, [isLoaded, bills]);

  // Generate Notifications
  const notifications: NotificationItem[] = useMemo(() => {
    const notifs: NotificationItem[] = [];

    bills.forEach((bill) => {
      if (bill.status === 'paid') return;
      const daysDiff = getDaysDifference(bill.dueDate);
      const cat = categories.find((c) => c.id === bill.categoryId)?.name || 'Conta';

      if (daysDiff < 0) {
        const days = Math.abs(daysDiff);
        const notifId = `notif-overdue-${bill.id}-${bill.dueDate}`;
        notifs.push({
          id: notifId,
          title: `Conta Vencida: ${bill.title}`,
          message: `O pagamento de ${formatCurrency(bill.amount)} (${cat}) venceu há ${days} ${days === 1 ? 'dia' : 'dias'} (${formatDate(bill.dueDate)}).`,
          date: bill.dueDate,
          type: 'overdue',
          read: readNotifIds.includes(notifId),
          billId: bill.id,
        });
      } else if (daysDiff === 0) {
        const notifId = `notif-today-${bill.id}-${bill.dueDate}`;
        notifs.push({
          id: notifId,
          title: `Vence Hoje: ${bill.title}`,
          message: `Lembrete: sua conta no valor de ${formatCurrency(bill.amount)} vence hoje!`,
          date: bill.dueDate,
          type: 'due_today',
          read: readNotifIds.includes(notifId),
          billId: bill.id,
        });
      } else if (daysDiff <= 3) {
        const notifId = `notif-soon-${bill.id}-${bill.dueDate}`;
        notifs.push({
          id: notifId,
          title: `Vencimento Próximo: ${bill.title}`,
          message: `Faltam ${daysDiff} ${daysDiff === 1 ? 'dia' : 'dias'} para o vencimento de ${formatCurrency(bill.amount)} (${formatDate(bill.dueDate)}).`,
          date: bill.dueDate,
          type: 'due_soon',
          read: readNotifIds.includes(notifId),
          billId: bill.id,
        });
      }
    });

    return notifs.sort((a, b) => {
      // Order overdue first, then today, then soon
      const order = { overdue: 0, due_today: 1, due_soon: 2, info: 3 };
      return order[a.type] - order[b.type];
    });
  }, [bills, categories, readNotifIds]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Computed Financial Stats
  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  }, [accounts]);

  const { currentMonthIncome, currentMonthExpense } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let inc = 0;
    let exp = 0;

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const [y, m] = tx.date.split('-').map(Number);
      if (y === currentYear && m - 1 === currentMonth) {
        if (tx.type === 'income') inc += tx.amount;
        if (tx.type === 'expense') exp += tx.amount;
      }
    });

    return { currentMonthIncome: inc, currentMonthExpense: exp };
  }, [transactions]);

  const {
    pendingBillsCount,
    pendingBillsTotal,
    overdueBillsCount,
    overdueBillsTotal,
    upcomingBillsCount,
    upcomingBillsTotal,
  } = useMemo(() => {
    let pCount = 0;
    let pTotal = 0;
    let oCount = 0;
    let oTotal = 0;
    let uCount = 0;
    let uTotal = 0;

    bills.forEach((bill) => {
      if (bill.status !== 'paid') {
        pCount += 1;
        pTotal += bill.amount;

        const diff = getDaysDifference(bill.dueDate);
        if (diff < 0 || bill.status === 'overdue') {
          oCount += 1;
          oTotal += bill.amount;
        } else if (diff <= 7) {
          uCount += 1;
          uTotal += bill.amount;
        }
      }
    });

    return {
      pendingBillsCount: pCount,
      pendingBillsTotal: pTotal,
      overdueBillsCount: oCount,
      overdueBillsTotal: oTotal,
      upcomingBillsCount: uCount,
      upcomingBillsTotal: uTotal,
    };
  }, [bills]);

  // Transaction Actions
  const addTransaction = (txData: Omit<Transaction, 'id'>): Transaction => {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Update account balance
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === newTx.accountId) {
          const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount;
          return { ...acc, balance: (acc.balance || 0) + delta };
        }
        return acc;
      })
    );

    return newTx;
  };

  const editTransaction = (id: string, updatedData: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const newTx = { ...oldTx, ...updatedData };

    setTransactions((prev) => prev.map((t) => (t.id === id ? newTx : t)));

    // Revert old impact and apply new impact to account balance(s)
    setAccounts((prev) =>
      prev.map((acc) => {
        let balance = acc.balance || 0;
        // Revert old
        if (acc.id === oldTx.accountId) {
          balance -= oldTx.type === 'income' ? oldTx.amount : -oldTx.amount;
        }
        // Apply new
        if (acc.id === newTx.accountId) {
          balance += newTx.type === 'income' ? newTx.amount : -newTx.amount;
        }
        return { ...acc, balance };
      })
    );
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Revert account balance
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === tx.accountId) {
          const delta = tx.type === 'income' ? -tx.amount : tx.amount;
          return { ...acc, balance: (acc.balance || 0) + delta };
        }
        return acc;
      })
    );
  };

  // Bill Actions
  const addBill = (billData: Omit<Bill, 'id' | 'status'>): Bill => {
    const daysDiff = getDaysDifference(billData.dueDate);
    const newBill: Bill = {
      ...billData,
      id: 'bill-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      status: daysDiff < 0 ? 'overdue' : 'pending',
    };

    setBills((prev) => [newBill, ...prev]);
    return newBill;
  };

  const editBill = (id: string, updatedData: Partial<Bill>) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const merged = { ...b, ...updatedData };
          if (merged.status !== 'paid') {
            const diff = getDaysDifference(merged.dueDate);
            merged.status = diff < 0 ? 'overdue' : 'pending';
          }
          return merged;
        }
        return b;
      })
    );
  };

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const payBill = (billId: string, accountId: string, paidDate?: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const actualPaidDate = paidDate || new Date().toISOString().split('T')[0];

    // Mark bill as paid
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: 'paid', paidAt: actualPaidDate, accountId } : b))
    );

    // Create automatic expense transaction
    addTransaction({
      description: `Pagamento: ${bill.title}`,
      amount: bill.amount,
      type: 'expense',
      categoryId: bill.categoryId,
      accountId: accountId,
      date: actualPaidDate,
      billId: bill.id,
      notes: bill.recipient ? `Favorecido: ${bill.recipient}` : undefined,
    });

    // Fire confetti celebratory effect
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'],
      });
    } catch {
      // ignore in environments without canvas
    }
  };

  const unpayBill = (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const daysDiff = getDaysDifference(bill.dueDate);
    const newStatus = daysDiff < 0 ? 'overdue' : 'pending';

    // Reset bill
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: newStatus, paidAt: undefined } : b))
    );

    // Find and remove linked transaction
    const linkedTx = transactions.find((t) => t.billId === billId);
    if (linkedTx) {
      deleteTransaction(linkedTx.id);
    }
  };

  // Account Actions
  const addAccount = (accData: Omit<Account, 'id'>): Account => {
    const newAcc: Account = {
      ...accData,
      id: 'acc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    setAccounts((prev) => [...prev, newAcc]);
    return newAcc;
  };

  const editAccount = (id: string, updatedData: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedData } : a)));
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const transferBetweenAccounts = (
    fromId: string,
    toId: string,
    amount: number,
    description: string = 'Transferência entre contas'
  ) => {
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);
    if (!fromAcc || !toAcc || amount <= 0) return;

    const today = new Date().toISOString().split('T')[0];

    // Outflow transaction
    addTransaction({
      description: `${description} para ${toAcc.name}`,
      amount: amount,
      type: 'expense',
      categoryId: 'cat-outros',
      accountId: fromId,
      date: today,
      notes: `Transferência enviada para ${toAcc.name}`,
    });

    // Inflow transaction
    addTransaction({
      description: `${description} de ${fromAcc.name}`,
      amount: amount,
      type: 'income',
      categoryId: 'cat-outros',
      accountId: toId,
      date: today,
      notes: `Transferência recebida de ${fromAcc.name}`,
    });
  };

  // Category Actions
  const addCategory = (catData: Omit<Category, 'id'>): Category => {
    const newCat: Category = {
      ...catData,
      id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    };
    setCategories((prev) => [...prev, newCat]);
    return newCat;
  };

  const editCategory = (id: string, updatedData: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c)));
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Notification Actions
  const markNotificationAsRead = (id: string) => {
    setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const markAllNotificationsAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
  };

  const resetToDemoData = () => {
    localStorage.clear();
    setAccounts(initialAccounts);
    setTransactions(initialTransactions);
    setBills(initialBills);
    setCategories(initialCategories);
    setReadNotifIds([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        bills,
        categories,
        notifications,
        unreadNotificationsCount,
        activeTab,
        setActiveTab,
        totalBalance,
        currentMonthIncome,
        currentMonthExpense,
        pendingBillsCount,
        pendingBillsTotal,
        overdueBillsCount,
        overdueBillsTotal,
        upcomingBillsCount,
        upcomingBillsTotal,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addBill,
        editBill,
        deleteBill,
        payBill,
        unpayBill,
        addAccount,
        editAccount,
        deleteAccount,
        transferBetweenAccounts,
        addCategory,
        editCategory,
        deleteCategory,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetToDemoData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
