'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import {
  Account,
  ActiveTab,
  Bill,
  Category,
  NotificationItem,
  Transaction,
} from '@/lib/types';
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
  // Neon DB status
  isDbConnected: boolean;
  isLoading: boolean;
  refreshData: () => Promise<void>;
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
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<Transaction | null>;
  editTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  // Actions - Bills
  addBill: (bill: Omit<Bill, 'id' | 'status'>) => Promise<Bill>;
  editBill: (id: string, bill: Partial<Bill>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  payBill: (billId: string, accountId: string, paidDate?: string) => Promise<void>;
  unpayBill: (billId: string) => Promise<void>;
  // Actions - Accounts
  addAccount: (acc: Omit<Account, 'id'>) => Promise<Account>;
  editAccount: (id: string, acc: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, description?: string) => Promise<void>;
  // Actions - Categories
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  editCategory: (id: string, cat: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  // Actions - Notifications
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  // Reset
  resetToDemoData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // States solely populated from Neon DB
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

  // Function to fetch fresh data directly from Neon DB
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAccounts(data.accounts || []);
          setTransactions(data.transactions || []);
          setBills(data.bills || []);
          setCategories(data.categories || []);
          setReadNotifIds(data.readNotifIds || []);
          setIsDbConnected(true);
        }
      }
    } catch (err) {
      console.error('Erro ao conectar e buscar dados do Neon DB:', err);
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch from Neon DB on mount and clear old localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('fincontrol_accounts_v1');
      localStorage.removeItem('fincontrol_transactions_v1');
      localStorage.removeItem('fincontrol_bills_v1');
      localStorage.removeItem('fincontrol_categories_v1');
      localStorage.removeItem('fincontrol_read_notifs_v1');
    } catch {
      // ignore
    }

    refreshData();
  }, [refreshData]);

  // Update bill statuses automatically based on current date
  useEffect(() => {
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
  }, [bills]);

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
  const addTransaction = async (txData: Omit<Transaction, 'id'>): Promise<Transaction | null> => {
    const tempId = 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const optimisticTx: Transaction = { ...txData, id: tempId };

    setTransactions((prev) => [optimisticTx, ...prev]);

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === txData.accountId) {
          const delta = txData.type === 'income' ? txData.amount : -txData.amount;
          return { ...acc, balance: (acc.balance || 0) + delta };
        }
        return acc;
      })
    );

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.transaction) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === tempId ? data.transaction : t))
          );
          return data.transaction;
        }
      }
    } catch (err) {
      console.error('Erro ao salvar transação no Neon DB:', err);
    }
    return optimisticTx;
  };

  const editTransaction = async (id: string, updatedData: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const newTx = { ...oldTx, ...updatedData };
    setTransactions((prev) => prev.map((t) => (t.id === id ? newTx : t)));

    setAccounts((prev) =>
      prev.map((acc) => {
        let balance = acc.balance || 0;
        if (acc.id === oldTx.accountId) {
          balance -= oldTx.type === 'income' ? oldTx.amount : -oldTx.amount;
        }
        if (acc.id === newTx.accountId) {
          balance += newTx.type === 'income' ? newTx.amount : -newTx.amount;
        }
        return { ...acc, balance };
      })
    );

    try {
      await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updatedData }),
      });
    } catch (err) {
      console.error('Erro ao atualizar transação no Neon DB:', err);
    }
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === tx.accountId) {
          const delta = tx.type === 'income' ? -tx.amount : tx.amount;
          return { ...acc, balance: (acc.balance || 0) + delta };
        }
        return acc;
      })
    );

    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar transação no Neon DB:', err);
    }
  };

  // Bill Actions
  const addBill = async (billData: Omit<Bill, 'id' | 'status'>): Promise<Bill> => {
    const daysDiff = getDaysDifference(billData.dueDate);
    const tempId = 'bill-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const optimisticBill: Bill = {
      ...billData,
      id: tempId,
      status: daysDiff < 0 ? 'overdue' : 'pending',
    };

    setBills((prev) => [optimisticBill, ...prev]);

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.bill) {
          setBills((prev) =>
            prev.map((b) => (b.id === tempId ? data.bill : b))
          );
          return data.bill;
        }
      }
    } catch (err) {
      console.error('Erro ao salvar conta no Neon DB:', err);
    }
    return optimisticBill;
  };

  const editBill = async (id: string, updatedData: Partial<Bill>) => {
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

    try {
      await fetch('/api/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updatedData }),
      });
    } catch (err) {
      console.error('Erro ao atualizar conta no Neon DB:', err);
    }
  };

  const deleteBill = async (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));

    try {
      await fetch(`/api/bills?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar conta no Neon DB:', err);
    }
  };

  const payBill = async (billId: string, accountId: string, paidDate?: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const actualPaidDate = paidDate || new Date().toISOString().split('T')[0];

    // Optimistically mark as paid
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: 'paid', paidAt: actualPaidDate, accountId } : b))
    );

    try {
      const res = await fetch('/api/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: billId, action: 'pay', accountId, paidDate: actualPaidDate }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Erro ao pagar conta no Neon DB:', err);
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'],
      });
    } catch {
      // ignore
    }
  };

  const unpayBill = async (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    try {
      const res = await fetch('/api/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: billId, action: 'unpay' }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Erro ao cancelar pagamento de conta no Neon DB:', err);
    }
  };

  // Account Actions
  const addAccount = async (accData: Omit<Account, 'id'>): Promise<Account> => {
    const tempId = 'acc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const optimisticAcc: Account = { ...accData, id: tempId };

    setAccounts((prev) => [...prev, optimisticAcc]);

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.account) {
          setAccounts((prev) =>
            prev.map((a) => (a.id === tempId ? data.account : a))
          );
          return data.account;
        }
      }
    } catch (err) {
      console.error('Erro ao salvar conta no Neon DB:', err);
    }
    return optimisticAcc;
  };

  const editAccount = async (id: string, updatedData: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedData } : a)));

    try {
      await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updatedData }),
      });
    } catch (err) {
      console.error('Erro ao atualizar conta no Neon DB:', err);
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));

    try {
      await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar conta no Neon DB:', err);
    }
  };

  const transferBetweenAccounts = async (
    fromId: string,
    toId: string,
    amount: number,
    description: string = 'Transferência entre contas'
  ) => {
    try {
      const res = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId, toId, amount, description }),
      });

      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Erro ao transferir no Neon DB:', err);
    }
  };

  // Category Actions
  const addCategory = async (catData: Omit<Category, 'id'>): Promise<Category> => {
    const tempId = 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const optimisticCat: Category = { ...catData, id: tempId };

    setCategories((prev) => [...prev, optimisticCat]);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.category) {
          setCategories((prev) =>
            prev.map((c) => (c.id === tempId ? data.category : c))
          );
          return data.category;
        }
      }
    } catch (err) {
      console.error('Erro ao criar categoria no Neon DB:', err);
    }
    return optimisticCat;
  };

  const editCategory = async (id: string, updatedData: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c)));

    try {
      await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updatedData }),
      });
    } catch (err) {
      console.error('Erro ao atualizar categoria no Neon DB:', err);
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar categoria no Neon DB:', err);
    }
  };

  // Notification Actions
  const markNotificationAsRead = async (id: string) => {
    setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Erro ao marcar notificação no Neon DB:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: allIds }),
      });
    } catch (err) {
      console.error('Erro ao marcar todas notificações no Neon DB:', err);
    }
  };

  const resetToDemoData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setTransactions(data.transactions || []);
        setBills(data.bills || []);
        setCategories(data.categories || []);
        setReadNotifIds([]);
      }
    } catch (err) {
      console.error('Erro ao restaurar dados no Neon DB:', err);
    } finally {
      setIsLoading(false);
    }
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
        isDbConnected,
        isLoading,
        refreshData,
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
