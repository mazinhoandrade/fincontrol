'use client';

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from '@/context/FinanceContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardView } from '@/components/DashboardView';
import { TransactionsView } from '@/components/TransactionsView';
import { BillsView } from '@/components/BillsView';
import { AccountsView } from '@/components/AccountsView';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { PayBillModal } from '@/components/modals/PayBillModal';
import { Bill } from '@/lib/types';

import { Sparkles, Database } from 'lucide-react';

function MainApp() {
  const { activeTab, isLoading } = useFinance();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<Bill | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Database className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">FinControl</h3>
            <p className="text-xs text-zinc-400 mt-1">Carregando dados diretamente do Neon PostgreSQL...</p>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mt-1" />
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'bills':
        return <BillsView />;
      case 'accounts':
        return <AccountsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onOpenNotifications={() => setIsNotificationsOpen(true)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenNotifications={() => setIsNotificationsOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {renderActiveView()}
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onPayBill={(bill) => setBillToPay(bill)}
      />

      {/* Quick Pay Modal triggered anywhere (e.g. from notifications) */}
      <PayBillModal
        isOpen={!!billToPay}
        onClose={() => setBillToPay(null)}
        bill={billToPay}
      />
    </div>
  );
}

export default function Home() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}
